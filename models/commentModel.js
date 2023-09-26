import mongoose from 'mongoose';
import Project from './projectModel.js';

const { Schema } = mongoose;
const commentSchema = new Schema(
  {
    comment: {
      type: String,
      required: [true, 'A comment is required'],
    },
    project: {
      type: mongoose.Schema.ObjectId,
      ref: 'Project',
      required: [true, 'A comment must belongs to a project'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A comment must belong to a user'],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

commentSchema.statics.calcCommentProject = async function (projectId) {
  const project = await this.aggregate([
    {
      $match: { project: projectId },
    },
    {
      $count: 'countProject',
    },
  ]);
  if (!project.length) {
    await Project.findByIdAndUpdate(projectId, { comment: 0 });
  } else if (project.length && project.length > 0) {
    await Project.findByIdAndUpdate(projectId, { comment: project[0].countProject });
  }
};

// Document middleware
commentSchema.post('save', function () {
  this.constructor.calcCommentProject(this.project);
});
commentSchema.post(/^findOneAnd/, async function (doc) {
  if (doc) await doc.constructor.calcCommentProject(doc.project);
});

const Comment = mongoose.model('Comment', commentSchema);
export default Comment;
