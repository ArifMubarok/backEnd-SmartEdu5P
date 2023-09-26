import Bookmark from '../models/bookmarkModel.js';
import APIFeatures from '../utils/apiFeatures.js';
import AppError from '../utils/appError.js';
import catchAsyncError from '../utils/catchAsyncError.js';

const bookmarkProject = catchAsyncError(async (req, res, next) => {
  const { project } = req.body;
  if (!project) return next(new AppError('Please provide a project', 400));

  const bookmark = await Bookmark.create({ project, user: req.user.id });
  res.status(201).json({
    status: 'success',
    data: {
      bookmark,
    },
  });
});

const unbookmarkProject = catchAsyncError(async (req, res, next) => {
  const { project } = req.body;
  if (!project) {
    return next(new AppError('Please provide a project', 400));
  }

  const unbookmarkProject = await Bookmark.findOneAndDelete({ project, user: req.user.id });
  if (!unbookmarkProject) {
    return next(new AppError('There is no project found', 404));
  }

  res.status(204).json({
    status: 'success',
    data: {
      unbookmark: unbookmarkProject,
    },
  });
});

const bookmarkedProjectByUser = catchAsyncError(async (req, res, next) => {
  const data = new APIFeatures(
    Bookmark.find({ user: req.user.id }).populate({ path: 'project', select: '-__v' }),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const bookmarked = await data.query;
  if (!bookmarked.length) {
    return next(new AppError('There is no bookmarked project found', 404));
  }

  res.status(200).json({
    status: 'success',
    results: bookmarked.length,
    data: {
      bookmarked,
    },
  });
});

export default { bookmarkProject, unbookmarkProject, bookmarkedProjectByUser };
