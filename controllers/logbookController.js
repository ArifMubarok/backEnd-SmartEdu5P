import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'path';

import catchAsyncError from '../utils/catchAsyncError.js';
import APIFeatures from '../utils/apiFeatures.js';
import Logbook from '../models/logbookModel.js';
import Project from '../models/projectModel.js';
import AppError from '../utils/appError.js';

const filterObject = (object, ...allowedFields) => {
  let newObject = {};
  Object.keys(object).forEach((key) => {
    if (allowedFields.includes(key)) newObject[key] = object[key];
  });
  return newObject;
};

const currentProject = catchAsyncError(async (req, res, next) => {
  let filterProject = {
    $and: [
      {
        $or: [{ chairman: req.user.id }, { members: req.user.id }],
      },
      { active: true },
    ],
  };
  if (req.user.role === 'guru') {
    filterProject = { $and: [{ teacher: req.user.id }, { active: true }] };
  }
  const project = await Project.findOne(filterProject);

  if (!project) return next(new AppError('You have no active project', 404));

  req.currentProject = project;
  next();
});

const getAllLogbooks = catchAsyncError(async (req, res, next) => {
  // filter find logbook base on project
  const filterLogbook = {
    project: req.params.projectId,
  };
  if (!req.params.projectId) {
    filterLogbook.project = req.currentProject.id;
  }

  let logbooks = new APIFeatures(Logbook.find(filterLogbook), req.query).filter().sort().limitFields().paginate();
  logbooks = await logbooks.query;
  res.status(200).json({
    status: 'success',
    results: logbooks.length,
    data: { logbooks },
  });
});

const getLogbook = catchAsyncError(async (req, res, next) => {
  const logbook = await Logbook.findById(req.params.id);
  if (!logbook) {
    return next(new AppError('No logbook found', 404));
  }
  console.log(
    logbook.date.toString(),
    logbook.date.toLocaleDateString(),
    logbook.date.toDateString(),
    new Date(2023, 10, 11).toDateString()
  );
  res.status(200).json({
    status: 'success',
    data: {
      logbook,
    },
  });
});

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/img/projects/logbooks');
  },
  filename: (req, file, cb) => {
    const extension = file.mimetype.split('/')[1];
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image') || file.mimetype.endsWith('pdf')) {
    cb(null, true);
  } else {
    cb(
      new AppError('Your file is not image or pdf file. Please make sure your file is image or pdf file!', 400),
      false
    );
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

const uploadSupportFiles = upload.array('supportFile');

const createLogbook = catchAsyncError(async (req, res, next) => {
  const { date, activity, time } = req.body;
  if (!date || !time) {
    return next(new AppError('Please provide a date and time', 400));
  }
  if (!activity) {
    return next(new AppError('Please provide a activity', 400));
  }

  if (!req.files.length) return next(new AppError('Please provide a support file for logbook', 400));
  const supportFile = req.files.map((file) => file.filename);
  if (!req.params.projectId) req.params.projectId = req.currentProject.id;
  const newLogbook = await Logbook.create({
    date,
    activity,
    time,
    project: req.params.projectId,
    supportFile,
  });

  res.status(201).json({
    status: 'success',
    data: {
      logbook: newLogbook,
    },
  });
});

const updateLogbook = catchAsyncError(async (req, res, next) => {
  const logbook = await Logbook.findById(req.params.id);
  if (!logbook.project.equals(req.currentProject.id)) {
    return next(new AppError('This logbook is not in your project', 400));
  }

  const { date, activity, time } = req.body;
  if (!date || !time) {
    return next(new AppError('Please provide a date and time', 400));
  }
  if (!activity) {
    return next(new AppError('Please provide a activity', 400));
  }

  let filterBody = filterObject(req.body, 'date', 'time', 'activity');
  if (req.files.length > 0) {
    const supportFile = req.files.map((file) => file.filename);
    filterBody = { $set: filterBody, $push: { supportFile } };
  }

  const updatedLogbook = await Logbook.findByIdAndUpdate(req.params.id, filterBody, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({
    status: 'success',
    data: {
      logbook: updatedLogbook,
    },
  });
});

const deleteLogbook = catchAsyncError(async (req, res, next) => {
  const logbook = await Logbook.findById(req.params.id);
  if (!logbook) {
    return next(new AppError('Logbook not found', 404));
  }
  const { supportFile } = logbook;
  const filesPath = supportFile.map(async (filename) => {
    const filePath = `${path.resolve()}/public/img/projects/logbooks/${filename}`;
    return await fs.unlink(filePath);
  });
  await Promise.all(filesPath);

  await Logbook.deleteOne({ _id: logbook.id });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

const validateLogbook = catchAsyncError(async (req, res, next) => {
  // Check if guru is must in the project
  const logbook = await Logbook.findById(req.params.id);
  if (!logbook) {
    return next(new AppError('No logbook found', 404));
  }
  const project = await Project.findById(logbook.project);
  if (!project.teacher._id.equals(req.user.id)) {
    return next(new AppError(`You can't validate because you are not in the project`));
  }

  const validatedLogbook = await Logbook.findByIdAndUpdate(
    req.params.id,
    { valid: true },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: 'success',
    data: {
      logbook: validatedLogbook,
    },
  });
});

const deleteSupportFile = catchAsyncError(async (req, res, next) => {
  const { filename } = req.body;
  if (!filename || !filename.length) {
    return next(new AppError('Please provide a filename that you want to delete', 400));
  }
  const logbook = await Logbook.findById(req.params.id);
  if (!logbook) {
    return next(new AppError('No Logbook found', 404));
  }

  if (Array.isArray(filename)) {
    const deleteFilePromise = filename.map(async (file) => {
      if (!logbook.supportFile.includes(file)) {
        return next(new AppError('There are no files with that name in this logbook', 404));
      }
      const filePath = `${path.resolve()}/public/img/projects/logbooks/${file}`;
      await fs.unlink(filePath);
      logbook.supportFile = logbook.supportFile.filter((supportFile) => supportFile !== file);
      await logbook.save();
    });
    await Promise.all(deleteFilePromise);
  }
  if (!logbook.supportFile.includes(filename)) {
    return next(new AppError('There is no file with that name in this logbook.', 404));
  }
  const filePath = `${path.resolve()}/public/img/projects/logbooks/${filename}`;
  await fs.unlink(filePath);
  logbook.supportFile = logbook.supportFile.filter((supportFile) => supportFile !== filename);
  await logbook.save();

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

export default {
  getAllLogbooks,
  getLogbook,
  createLogbook,
  updateLogbook,
  deleteLogbook,
  currentProject,
  uploadSupportFiles,
  validateLogbook,
  deleteSupportFile,
};
