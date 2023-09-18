import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

import User from '../models/userModel.js';
import AppError from '../utils/appError.js';
import catchAsyncError from '../utils/catchAsyncError.js';
import Email from '../utils/email.js';

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You are not allowed to access this actions', 403));
    }
    next();
  };
};

const signup = catchAsyncError(async (req, res, next) => {
  const { firstName, lastName, username, schoolNPSN, email, password, passwordConfirm, photo, role } = req.body;
  const newuser = await User.create({
    firstName,
    lastName,
    username,
    schoolNPSN,
    email,
    password,
    passwordConfirm,
    photo,
    role,
  });

  // TODO: send email for welcome to this application
  const url = `${req.protocol}://${req.get('host')}/api/users/me`;
  await new Email(newuser, url).sendWelcome();

  createSendToken(newuser, 201, res);
});

const login = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.checkCorrectPassword(password, user.password))) {
    return next(new AppError('Incorect email or password', 401));
  }

  createSendToken(user, 200, res);
});

const protect = catchAsyncError(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) return next(new AppError('You are not logged in. Please log in first.', 401));

  // Verification token
  const decodedToken = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const currentUser = await User.findById(decodedToken.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token does no longer exist', 401));
  }

  // Check if the user is changed password after the token was issued
  if (currentUser.checkChangePasswordAfter(decodedToken.iat)) {
    return next(new AppError('User recently changed password! Please log in again', 401));
  }

  req.user = currentUser;
  next();
});

const forgotPassword = catchAsyncError(async (req, res, next) => {
  const { email } = req.body;
  if (!email) return next(new AppError('Please provide your email address', 400));

  const user = await User.findOne({ email });
  if (!user) return next(new AppError('There is no user with that email address', 404));

  const resetToken = await user.createResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  // TODO: Send email password reset to user's email
  // url: for email reset password http://host/api/v1/users/resetPassword/:token
  const url = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
  await new Email(user, url).sendPasswordReset();

  res.status(200).json({
    status: 'success',
    token: resetToken,
    message: 'Please check your email to reset your password',
  });
});

const resetPassword = catchAsyncError(async (req, res, next) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  // Set new password and set passwordChangeAt in model
  const { password, passwordConfirm } = req.body;
  if (!password || !passwordConfirm) {
    return next(new AppError('Please provide your new password and confirm password', 400));
  }
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Login the user who is recently reset password
  createSendToken(user, 200, res);
});

const updatePassword = catchAsyncError(async (req, res, next) => {
  const { password, passwordConfirm, passwordCurrent } = req.body;
  if (!passwordCurrent) {
    return next(new AppError('Please provide your current password', 400));
  }
  if (!password || !passwordConfirm) {
    return next(new AppError('Please provide your new password and confirm password', 400));
  }

  const user = await User.findById(req.user.id).select('+password');
  const correctPassword = await user.checkCorrectPassword(passwordCurrent, user.password);
  if (!correctPassword) {
    return next(new AppError('Your current password is incorrect', 400));
  }

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  await user.save();

  createSendToken(user, 200, res);
});

export default { signup, login, protect, forgotPassword, resetPassword, restrictTo, updatePassword };
