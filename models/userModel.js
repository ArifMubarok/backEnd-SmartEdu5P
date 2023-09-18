import mongoose from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import crypto from 'crypto';

const { Schema } = mongoose;
const userSchema = new Schema(
  {
    firstName: {
      type: String,
      trim: true,
      required: [true, 'Please provide your first name'],
    },
    lastName: {
      type: String,
      trim: true,
      required: [true, 'Please provide your last name'],
    },
    photo: {
      type: String,
      default: 'default.png',
    },
    role: {
      type: String,
      enum: ['guru', 'siswa'],
      default: 'siswa',
    },
    schoolNPSN: {
      type: String,
      required: [true, 'Please provide which school are you from'],
    },
    username: {
      type: String,
      required: [true, 'Please provide your username'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: true,
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Please confirm your password'],
      validate: {
        validator: function (value) {
          return value === this.password;
        },
        message: 'Password are not the same! Please try again',
      },
    },
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
      type: Boolean,
      select: false,
      default: true,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual properties
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});
userSchema.virtual('school');

// Virtual Methods
userSchema.methods.getSchool = async function (npsn) {
  const result = await axios({
    method: 'GET',
    url: `https://api-sekolah-indonesia.vercel.app/sekolah?npsn=${npsn}`,
  });
  return result.data.dataSekolah[0];
};
userSchema.methods.checkCorrectPassword = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};
userSchema.methods.checkChangePasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedPassword = this.passwordChangedAt.getTime() / 1000;

    return JWTTimestamp < changedPassword;
  }
  return false;
};
userSchema.methods.createResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  console.log({
    resetToken,
    passwordResetToken: this.passwordResetToken,
    passwordResetExpires: this.passwordResetExpires,
  });

  return resetToken;
};

// Document middleware
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);

  this.passwordConfirm = undefined;
  next();
});
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Query middleware
userSchema.pre(/^find/, function (next) {
  this.find({ active: true });
  next();
});

const User = mongoose.model('User', userSchema);

export default User;
