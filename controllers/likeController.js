import catchAsyncError from '../utils/catchAsyncError.js';
import APIFeatures from '../utils/apiFeatures.js';
import AppError from '../utils/appError.js';
import Like from '../models/likeModel.js';

const likeProject = catchAsyncError(async (req, res, next) => {
  const { project } = req.body;
  if (!project) return next(new AppError('Please provide a project', 400));

  const like = await Like.create({
    project: req.body.project,
    user: req.user.id,
  });

  res.status(201).json({
    status: 'success',
    data: {
      like: like,
    },
  });
});

const unlikeProject = catchAsyncError(async (req, res, next) => {
  const { project } = req.body;
  if (!project) return next(new AppError('Please provide a project that you want to unlike', 400));

  const unlikedProject = await Like.findOneAndDelete({ project: req.body.project, user: req.user.id });
  if (!unlikedProject) {
    return next(new AppError('There is no project found', 404));
  }
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

const likeByCurrentUser = catchAsyncError(async (req, res, next) => {
  const projects = new APIFeatures(
    Like.find({ user: req.user.id }).populate({ path: 'project', select: '-__v' }),
    req.query
  )
    .filter()
    .limitFields()
    .sort()
    .paginate();
  const likedProjectByUser = await projects.query;

  if (!likedProjectByUser.length) {
    return next(new AppError('There is no liked project found', 404));
  }

  res.status(200).json({
    status: 'success',
    results: likedProjectByUser.length,
    data: {
      likedProjectByUser,
    },
  });
});

export default { likeProject, unlikeProject, likeByCurrentUser };
