import express from 'express';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import morgan from 'morgan';
import hpp from 'hpp';

import userRouter from './routes/userRoutes.js';
import projectRouter from './routes/projectRoutes.js';
import logbookRouter from './routes/logbookRoutes.js';
import likeRouter from './routes/likeRoutes.js';
import bookmarRouter from './routes/bookmarkRoutes.js';
import searchRouter from './routes/searchRoutes.js';
import commentRouter from './routes/commentRoutes.js';
import globalErrorHandler from './controllers/errorController.js';
import AppError from './utils/appError.js';

// Logging uncaught error
process.on('uncaughtException', (error) => {
  console.log('UNCHAUGHT EXCEPTION! Shutting down...');
  console.log(error.name, error.message);
  process.exit(1);
});

dotenv.config({ path: '.env' });
const app = express();

// Serving static files
app.use(express.static(path.join(path.resolve(), 'public')));
app.set('view engine', 'pug');
app.set('views', path.join(path.resolve(), 'views'));

// Loging when in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Set security HTTP headers
app.use(helmet());

// Body parser for JSON, form data and cookie parser
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '20kb' }));
app.use(cookieParser());

// Data sanitization for noSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

// Routing configuration
app.use('/api/v1/users', userRouter);
app.use('/api/v1/projects', projectRouter);
app.use('/api/v1/logbooks', logbookRouter);
app.use('/api/v1/likes', likeRouter);
app.use('/api/v1/bookmarks', bookmarRouter);
app.use('/api/v1/comments', commentRouter);
app.use('/api/v1/search', searchRouter);

app.all('*', function (req, res, next) {
  return next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});
app.use(globalErrorHandler);

// DATABASE CONFIG
const DB =
  process.env.NODE_ENV === 'production'
    ? process.env.DB_PROD
    : process.env.DB_DEV.replace('<PASSWORD>', process.env.DB_PASSWORD_DEV);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
  })
  .then(() => {
    console.log('DB connection established');
  })
  .catch((error) => {
    console.log('Error connecting to database');
  });

const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(process.env.NODE_ENV);
  console.log(`App running on port ${port}`);
});

process.on('unhandledRejection', (error) => {
  console.log(error);
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  server.close(() => {
    process.exit(1);
  });
});
