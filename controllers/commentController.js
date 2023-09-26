import catchAsyncError from '../utils/catchAsyncError.js';
import APIFeatures from '../utils/apiFeatures.js';
import AppError from '../utils/appError.js';

import Comment from '../models/commentModel.js';

const commentProject = catchAsyncError(async (req, res, next) => {
  const { comment, project } = req.body;
  if (!comment) {
    return next(new AppError('Please provide a comment', 400));
  }
  if (!projectId) {
    return next(new AppError('Please provide a project ID', 400));
  }

  const commentData = await Comment.create({
    comment,
    project,
    user: req.user.id,
  });

  res.status(201).json({
    status: 'success',
    data: {
      comment: commentData,
    },
  });
});

const deleteComment = catchAsyncError(async (req, res, next) => {
  const deletedComment = await Comment.findByIdAndDelete(req.params.id);
  if (!deletedComment) return next(new AppError('There is no comment found', 404));

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

export default { commentProject, deleteComment };
