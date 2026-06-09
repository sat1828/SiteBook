import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: ['compliance_deadline', 'anomaly', 'wage_run', 'system'],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
  link: String,
  read: { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
