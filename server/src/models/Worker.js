import mongoose from 'mongoose';

const workerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Worker name is required'],
    trim: true,
    maxlength: 100,
  },
  fatherName: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  phone: {
    type: String,
    match: [/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'],
  },
  aadhaarLast4: {
    type: String,
    match: [/^\d{4}$/, 'Aadhaar must be last 4 digits'],
  },
  skill: {
    type: String,
    enum: ['unskilled', 'semi_skilled', 'skilled', 'highly_skilled'],
    required: [true, 'Skill category is required'],
  },
  siteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: true,
    index: true,
  },
  contractorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  agreedRate: {
    type: Number,
    required: [true, 'Agreed daily wage rate is required'],
    min: 0,
  },
  bankDetails: {
    accountNumber: { type: String },
    ifscCode: { type: String },
    upiId: { type: String },
  },
  esicNumber: { type: String },
  epfUan: { type: String },
  appointmentLetterGenerated: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  leavedAt: Date,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

workerSchema.index({ siteId: 1, isActive: 1 });
workerSchema.index({ contractorId: 1 });
workerSchema.index({ phone: 1 });

const Worker = mongoose.model('Worker', workerSchema);
export default Worker;
