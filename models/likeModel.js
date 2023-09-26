import mongoose from 'mongoose';
import Project from './projectModel.js';

const { Schema } = mongoose;
const likeSchema = new Schema(
  {
    project: {
      type: mongoose.Schema.ObjectId,
      ref: 'Project',
      required: [true, 'Like must belongs to a project'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Like must belongs to a user'],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for user and project
likeSchema.index({ project: 1, user: 1 }, { unique: true });

// static methods
likeSchema.statics.calcLikeProject = async function (projectId) {
  const project = await this.aggregate([
    {
      $match: { project: projectId },
    },
    {
      $count: 'countProject',
    },
  ]);
  if (!project.length) {
    await Project.findByIdAndUpdate(projectId, { like: 0 });
  } else if (project.length && project.length > 0) {
    await Project.findByIdAndUpdate(projectId, { like: project[0].countProject });
  }
};

// Document middleware
likeSchema.post('save', function () {
  this.constructor.calcLikeProject(this.project);
});
likeSchema.post(/^findOneAnd/, async function (doc) {
  if (doc) await doc.constructor.calcLikeProject(doc.project);
});

const Like = mongoose.model('Like', likeSchema);

export default Like;
