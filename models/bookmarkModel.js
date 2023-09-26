import mongoose from 'mongoose';
import Project from './projectModel.js';

const { Schema } = mongoose;
const bookmarkSchema = new Schema(
  {
    project: {
      type: mongoose.Schema.ObjectId,
      ref: 'Project',
      required: [true, 'A bookmark must belong to a project'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A bookmark must belong to a user'],
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

// compound index
bookmarkSchema.index({ project: 1, user: 1 }, { unique: true });

bookmarkSchema.statics.calcBookmarkProject = async function (projectId) {
  const project = await this.aggregate([
    {
      $match: { project: projectId },
    },
    {
      $count: 'bookmarkProject',
    },
  ]);

  if (!project.length) {
    await Project.findByIdAndUpdate(projectId, { bookmark: 0 });
  } else if (project.length && project.length > 0) {
    await Project.findByIdAndUpdate(projectId, { bookmark: project[0].bookmarkProject });
  }
};

// Document Middleware
bookmarkSchema.post('save', function () {
  this.constructor.calcBookmarkProject(this.project);
});
bookmarkSchema.post(/^findOneAnd/, async function (doc) {
  if (doc) await doc.constructor.calcBookmarkProject(doc.project);
});

const Bookmark = mongoose.model('Bookmark', bookmarkSchema);
export default Bookmark;
