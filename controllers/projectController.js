import multer from 'multer';
import fs from 'fs';
import path from 'path';

import Project from '../models/projectModel.js';
import User from '../models/userModel.js';
import APIFeatures from '../utils/apiFeatures.js';
import AppError from '../utils/appError.js';
import catchAsyncError from '../utils/catchAsyncError.js';

const getAllProject = catchAsyncError(async (req, res, next) => {
  let filter = { $or: [{ chairman: req.user.id }, { members: req.user.id }] };
  if (req.user.role === 'guru') {
    filter = { teacher: req.user.id };
  }
  if (req.query.public) {
    filter = {};
  }
  let projects = new APIFeatures(Project.find(filter), req.query).filter().sort().limitFields().paginate();
  projects = await projects.query;

  res.status(200).json({
    status: 'success',
    results: projects.length,
    data: {
      projects,
    },
  });
});

const getProject = catchAsyncError(async (req, res, next) => {
  const project = await Project.findById(req.params.id).populate({ path: 'logbooks', select: '-__v' });
  if (!project) return next(new AppError('No project found', 404));

  res.status(200).json({
    status: 'success',
    data: {
      project,
    },
  });
});

const createProject = catchAsyncError(async (req, res, next) => {
  const projects = await Project.find().and([
    { $or: [{ chairman: req.user.id }, { members: req.user.id }] },
    { active: true },
  ]);

  if (projects.length > 0) {
    return next(new AppError('You already have an active project', 400));
  }

  const { name, topic, description } = req.body;
  if (!name || !topic) return next(new AppError('Please provide a name and topic of your project', 400));
  const project = await Project.create({
    name,
    topic,
    description,
    chairman: req.user.id,
  });

  res.status(201).json({
    status: 'success',
    data: {
      project,
    },
  });
});

const checkIsChairman = catchAsyncError(async (req, res, next) => {
  // TODO: Split between checkIsChairman and currentProject
  req.body.currentProject = await Project.findById(req.params.id);
  req.currentProject = req.body.currentProject;

  const { currentProject } = req.body;
  if (!currentProject) {
    return next(new AppError('No project found', 404));
  }
  if (!currentProject.chairman.equals(req.user.id)) {
    return next(new AppError('You are not chairman of this project.', 400));
  }
  return next();
});

const checkMembersField = catchAsyncError(async (req, res, next) => {
  const { members } = req.body;
  if (!members || members.length === 0) {
    return next();
  }

  // Check if members is not in the same school as chairman
  const chairmanSchool = req.user.schoolNPSN;
  if (!Array.isArray(members)) {
    const memberSchool = (await User.findById(members)).schoolNPSN;
    if (memberSchool !== chairmanSchool)
      return next(new AppError(`This user (${members}) is not in the same school as you`));
  }
  const memberPromise = members.map(async (member) => {
    const memberSchool = (await User.findById(member)).schoolNPSN;
    if (memberSchool !== chairmanSchool)
      return next(new AppError(`This user (${member}) is not in the same school as you`));
  });
  await Promise.all(memberPromise);

  // Check if member is already in the project
  const projectMembers = req.body.currentProject.members;
  projectMembers.forEach(({ id, fullName }) => {
    if ((Array.isArray(members) && members.includes(id)) || members === id) {
      return next(new AppError(`This user (${fullName}) is already a member of this project.`, 400));
    }
  });
  next();
});

const sendRes = (req, res, next) => {
  res.status(200).json({
    status: 'success',
  });
};

const filterObject = (object, ...allowedFields) => {
  let newObject = {};
  Object.keys(object).forEach((key) => {
    if (allowedFields.includes(key)) newObject[key] = object[key];
  });
  return newObject;
};

// const checkResultField = (req, res, next) => {
//   const { result } = req.body;
//   if (!result || (Array.isArray(result) && result.length === 0)) {
//     return next();
//   }
// };

const updateProject = catchAsyncError(async (req, res, next) => {
  let updatedFields = filterObject(req.body, 'name', 'topic', 'description', 'teacher');
  const teacher = await User.findById(updatedFields.teacher);
  if (teacher.schoolNPSN !== req.user.schoolNPSN) {
    return next(new AppError(`This teacher (${teacher.fullName}) is not in the same school as you`, 400));
  }
  if (req.body.members) {
    updatedFields = {
      $set: { updatedFields },
      $push: { members: req.body.members },
    };
  }

  const updatedProject = await Project.findByIdAndUpdate(req.params.id, updatedFields, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      project: updatedProject,
    },
  });
});

const deleteProject = catchAsyncError(async (req, res, next) => {
  const project = await Project.findByIdAndDelete(req.params.id);
  if (!project) return next(new AppError('No project found', 404));

  // TODO: Check / testing this condition
  if (project.result.length) {
    const deleteResultFile = project.result.map(async (result) => {
      const filePath = `${path.resolve()}/public/img/projects/results/${result}`;
      if (fs.existsSync(filePath)) await fs.promise.unlink(filePath);
    });
    await Promise.all(deleteResultFile);
  }

  // TODO: Delete all logbook in the project

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

const activateProject = catchAsyncError(async (req, res, next) => {
  let project = await Project.findById(req.params.id);
  if (!project) {
    return next(new AppError('No Project found', 404));
  }
  if (!project.chairman._id.equals(req.user.id)) {
    return next(
      new AppError(
        `You are not allowed to activate this project because you are not a chairman of this project. Please ask your team leader (${project.chairman.fullName}) to activate this project.`,
        400
      )
    );
  }

  await Project.updateMany(
    {
      $or: [{ chairman: req.user.id }],
    },
    { active: false },
    { new: true },
    function (error) {
      if (error) return next(new AppError('Error when processing request', 400));
    }
  );
  project = await Project.findByIdAndUpdate(req.params.id, { active: true }, { new: true });

  res.status(200).json({
    status: 'success',
    data: {
      project,
    },
  });
});

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/img/projects/results');
  },
  filename: async (req, file, cb) => {
    // console.log(req.body);
    const filename = `result-${req.currentProject.name.replace(' ', '-')}-${Date.now()}-${file.originalname.replace(
      ' ',
      '-'
    )}`;
    cb(null, filename);
  },
});
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Your file is not image file. Please make sure your file is image file!', 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

const uploadFileResults = upload.array('results');

const uploadResults = catchAsyncError(async (req, res, next) => {
  if (!req.files || !req.files.length) return next(new AppError('Please provide a result image', 400));

  // Delete old file result
  const oldResult = req.currentProject.result;
  const deleteOldResult = oldResult.map(async (result) => {
    const filePath = `${path.resolve()}/public/img/projects/results/${result}`;
    if (fs.existsSync(filePath)) await fs.promise.unlink(filePath);
  });
  await Promise.all(deleteOldResult);

  const result = req.files.map((file) => file.filename);
  const updatedResults = await Project.findByIdAndUpdate(
    req.params.id,
    {
      result,
      finish: true,
    },
    { new: true }
  );

  res.status(200).json({
    status: 'success',
    data: {
      project: updatedResults,
    },
  });
});

const publishProject = catchAsyncError(async (req, res, next) => {
  let project = await Project.findById(req.params.id);
  if (!project.teacher._id.equals(req.user.id)) {
    return next(new AppError('You are not a mentor teacher of this project', 400));
  }
  project = await Project.findByIdAndUpdate(
    req.params.id,
    {
      public: true,
    },
    { new: true }
  );

  res.status(200).json({
    status: 'success',
    data: {
      project,
    },
  });
});

// const getAllProjectTest = catchAsyncError(async (req, res, next) => {
//   const projects = await Project.find();
//   res.status(200).json({
//     status: 'success',
//     results: projects.length,
//     data: {
//       projects,
//     },
//   });
// });

export default {
  getAllProject,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  activateProject,
  checkMembersField,
  sendRes,
  checkIsChairman,
  uploadResults,
  uploadFileResults,
  publishProject,
};
