import mongoose from 'mongoose';

const wageRunEntrySchema = new mongoose.Schema({
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true,
  },
  workerName: { type: String, required: true },
  fatherName: String,
  skill: String,
  dailyRate: { type: Number, required: true },
  totalDays: { type: Number, required: true },
  fullDays: { type: Number, default: 0 },
  halfDays: { type: Number, default: 0 },
  absentDays: { type: Number, default: 0 },
  overtimeDays: { type: Number, default: 0 },
  totalOvertimeHours: { type: Number, default: 0 },
  basePay: { type: Number, required: true },
  overtimePay: { type: Number, default: 0 },
  grossPay: { type: Number, required: true },
  epfEmployer: { type: Number, default: 0 },
  epfEmployee: { type: Number, default: 0 },
  esicEmployer: { type: Number, default: 0 },
  esicEmployee: { type: Number, default: 0 },
  netPayable: { type: Number, required: true },
  adjustments: [{
    type: { type: String, enum: ['bonus', 'deduction', 'advance'], default: 'deduction' },
    amount: Number,
    reason: String,
  }],
}, { _id: false });

const wageRunSchema = new mongoose.Schema({
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
  month: {
    type: Number,
    required: [true, 'Month is required (1-12)'],
    min: 1,
    max: 12,
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
  },
  workers: [wageRunEntrySchema],
  totalLabourCost: { type: Number, default: 0 },
  totalEpfEmployer: { type: Number, default: 0 },
  totalEpfEmployee: { type: Number, default: 0 },
  totalEsicEmployer: { type: Number, default: 0 },
  totalEsicEmployee: { type: Number, default: 0 },
  totalNetPayable: { type: Number, default: 0 },
  budgetVariance: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['draft', 'approved', 'paid'],
    default: 'draft',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: Date,
  paidAt: Date,
  paymentReference: String,
}, {
  timestamps: true,
});

wageRunSchema.index({ siteId: 1, month: 1, year: 1 }, { unique: true });
wageRunSchema.index({ contractorId: 1, status: 1 });

wageRunSchema.statics.calculateEpfEsic = function (grossPay, isEligible = true) {
  if (!isEligible || grossPay <= 0) {
    return { epfEmployer: 0, epfEmployee: 0, esicEmployer: 0, esicEmployee: 0 };
  }
  const epfWage = Math.min(grossPay, 15000);
  return {
    epfEmployer: Math.round(epfWage * 0.12),
    epfEmployee: Math.round(epfWage * 0.12),
    esicEmployer: Math.round(grossPay * 0.0325),
    esicEmployee: Math.round(grossPay * 0.0075),
  };
};

const WageRun = mongoose.model('WageRun', wageRunSchema);
export default WageRun;
