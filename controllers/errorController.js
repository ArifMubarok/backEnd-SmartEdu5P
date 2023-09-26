import AppError from '../utils/appError.js';
import fs from 'fs';
import path from 'path';

const handleValidationErrorDB = (error) => {
  const newError = Object.values(error.errors).map((element) => element.message);
  const message = `Invalid input data.${newError.join(', ')}`;
  return new AppError(message, 400);
};

const handleDuplicateValueDB = (error) => {
  const name = Object.keys(error.keyValue)[0];
  const message = `This ${name} is already taken. Please use another ${name}`;
  return new AppError(message, 400);
};

const handleCastErrorDB = (error) => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return new AppError(message, 400);
};

const handleJWTError = () => new AppError('Invalid token. Please log in again', 401);
const handleJWTExpiredError = () => new AppError('Your token has expired. Please log in again!', 401);

const handlePaginateError = () => new AppError('Page not found', 404);

const sendErrorDev = (error, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(error.statusCode).json({
      status: error.status,
      error: error,
      message: error.message,
      stack: error.stack,
    });
  }
};

const sendErrorProd = (error, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    if (error.isOperational) {
      return res.status(error.statusCode).json({
        status: error.status,
        message: error.message,
      });
    }

    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong',
    });
  }
};

export default async (error, req, res, next) => {
  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';

  if (req.files && req.files.length > 0) {
    const files = req.files.map(async (file) => {
      const filePath = `${path.resolve()}/${file.destination}/${file.filename}`;
      return await fs.promise.unlink(filePath);
    });

    await Promise.all(files);
  }

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let newError = { ...error };
    if (error.name === 'ValidationError') newError = handleValidationErrorDB(newError);
    if (error.code === 11000) newError = handleDuplicateValueDB(newError);
    if (error.name === 'CastError') newError = handleCastErrorDB(newError);
    if (error.name === 'JsonWebTokenError') newError = handleJWTError();
    if (error.name === 'TokenExpiredError') newError = handleJWTExpiredError();
    if (error.code === 51024) newError = handlePaginateError();

    sendErrorProd(newError, req, res);
  }
};
