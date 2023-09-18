import AppError from '../utils/appError.js';

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

export default (error, req, res, next) => {
  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let newError = { ...error };
    if (error.name === 'ValidationError') newError = handleValidationErrorDB(newError);
    if (error.code === 11000) newError = handleDuplicateValueDB(newError);

    sendErrorProd(newError, req, res);
  }
};
