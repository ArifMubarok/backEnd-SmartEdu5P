import multer from 'multer';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'path';

import User from '../models/userModel.js';
import APIFeatures from '../utils/apiFeatures.js';
import AppError from '../utils/appError.js';
import catchAsyncError from '../utils/catchAsyncError.js';

const filterObject = (object, ...allowedFields) => {
  let newObject = {};
  Object.keys(object).forEach((key) => {
    if (allowedFields.includes(key)) newObject[key] = object[key];
  });

  return newObject;
};

const getAllUsers = catchAsyncError(async (req, res, next) => {
  const features = new APIFeatures(User.find(), req.query).filter().sort().limitFields().paginate();
  const users = await features.query;

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users,
    },
  });
});

const getMe = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  user.school = await user.getSchool(user.schoolNPSN);
  user.schoolNPSN = undefined;

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, callback) => {
  if (file.mimetype.startsWith('image')) {
    callback(null, true);
  } else {
    callback(new AppError('Not an image file! Please upload image only', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

const uploadUserPhoto = upload.single('photo');

const resizeUserPhoto = catchAsyncError(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 95 })
    .toFile(`public/img/users/profile/${req.file.filename}`);

  next();
});

const updateMe = catchAsyncError(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError(`Can't update your password! Use update password instead`, 400));
  }

  // User already has a photo, we should need remove the old photo and replace it with the new one
  const user = await User.findById(req.user.id);
  if (user.photo && user.photo !== 'default.png') {
    const filePath = `${path.resolve()}/public/img/users/profile/${user.photo}`;

    await fs.unlink(filePath);
  }

  const filteredBody = filterObject(req.body, 'firstName', 'lastName', 'username');
  if (req.file) filteredBody.photo = req.file.filename;

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

export default { getAllUsers, getMe, updateMe, uploadUserPhoto, resizeUserPhoto };
