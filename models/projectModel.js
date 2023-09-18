import mongoose from 'mongoose';

const { Schema } = mongoose;
const projectSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'A project must have a title'],
    },
    topic: {
      type: String,
      required: [true, 'A project must have a main topic'],
    },
    description: {
      type: String,
    },
    chairman: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A project must have a chairman'],
    },
    members: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
    teacher: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    result: [String],
    active: {
      type: Boolean,
      default: true,
    },
    finish: {
      type: Boolean,
      default: false,
    },
    public: {
      type: Boolean,
      default: false,
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

// Virtual Populate
projectSchema.virtual('logbooks', {
  ref: 'Logbook',
  foreignField: 'project',
  localField: '_id',
});
// Indexes for members
// projectSchema.index({ members: 1 }, { unique: true });

// Document Middleware

// Query middleware
projectSchema.pre(/^find/, function (next) {
  // console.log(this);
  next();
});
projectSchema.pre('findOne', function (next) {
  this.populate({
    path: 'chairman',
    select: 'firstName lastName',
  })
    .populate({
      path: 'members',
      select: 'firstName lastName',
    })
    .populate({
      path: 'teacher',
      select: '-__v',
    });

  next();
});

const Project = mongoose.model('Project', projectSchema);

export default Project;
