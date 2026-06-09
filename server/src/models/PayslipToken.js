import mongoose from 'mongoose';

const payslipTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, index: true },
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
  wageRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'WageRun', required: true },
  createdAt: { type: Date, default: Date.now, index: { expires: 604800 } },
});

const PayslipToken = mongoose.model('PayslipToken', payslipTokenSchema);
export default PayslipToken;
