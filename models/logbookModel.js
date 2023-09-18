import mongoose from 'mongoose';

const { Schema } = mongoose;
const logbookSchema = new Schema({
  date: {
    type: Date,
    required: [true, 'A logbook must have a activity date'],
  },
  activity: {
    type: String,
    required: [true, 'A logbook must have a activity '],
  },
  time: {
    type: Number,
    required: [true, 'A logbook must have a time activity'],
  },
  project: {
    type: mongoose.Schema.ObjectId,
    ref: 'Project',
  },
  supportFile: [
    {
      type: String,
      required: [true, 'A logbook must have a support file'],
    },
  ],
  valid: {
    type: Boolean,
    default: false,
  },
});

const Logbook = mongoose.model('Logbook', logbookSchema);

export default Logbook;
