import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
  },
  phone: {
    type: String,
    required: [true, 'Phone is required'],
    unique: true,
    match: [/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false,
  },
  role: {
    type: String,
    enum: {
      values: ['contractor', 'supervisor', 'compliance_officer'],
      message: '{VALUE} is not a valid role',
    },
    required: [true, 'Role is required'],
  },
  contractorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  assignedSites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
  }],
  bocwRegNo: { type: String, trim: true },
  contractorLicenseNo: { type: String, trim: true },
  establishmentAddress: { type: String, trim: true },
  isActive: {
    type: Boolean,
    default: true,
  },
  refreshToken: {
    type: String,
    select: false,
  },
}, {
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      delete ret.password;
      delete ret.refreshToken;
      delete ret.__v;
      return ret;
    },
  },
});

userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ contractorId: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
