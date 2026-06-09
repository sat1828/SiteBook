import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true,
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
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
  },
  status: {
    type: String,
    enum: ['full', 'half', 'absent', 'overtime'],
    required: [true, 'Attendance status is required'],
  },
  overtimeHours: {
    type: Number,
    default: 0,
    min: 0,
    max: 12,
  },
  photoUrl: { type: String },
  photoPublicId: { type: String },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  geoValidated: {
    type: Boolean,
    default: false,
  },
  geoCoordinates: {
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: {
      type: [Number],
    },
  },
  syncedFromOffline: {
    type: Boolean,
    default: false,
  },
  offlineId: { type: String },
  notes: { type: String, trim: true },
}, {
  timestamps: true,
});

attendanceSchema.index({ workerId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ siteId: 1, date: 1 });
attendanceSchema.index({ contractorId: 1, date: 1 });
attendanceSchema.index({ offlineId: 1 }, { unique: true, sparse: true });
// TTL index: auto-delete attendance records older than 5 years (BOCW Act compliance)
attendanceSchema.index({ createdAt: 1 }, { expireAfterSeconds: 157680000 });

attendanceSchema.statics.getAggregatedMonthly = async function (siteId, month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  return this.aggregate([
    { $match: { siteId: new mongoose.Types.ObjectId(siteId), date: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: '$workerId',
        totalDays: { $sum: 1 },
        fullDays: { $sum: { $cond: [{ $eq: ['$status', 'full'] }, 1, 0] } },
        halfDays: { $sum: { $cond: [{ $eq: ['$status', 'half'] }, 1, 0] } },
        absentDays: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
        overtimeDays: { $sum: { $cond: [{ $eq: ['$status', 'overtime'] }, 1, 0] } },
        totalOvertimeHours: { $sum: { $ifNull: ['$overtimeHours', 0] } },
        attendanceRecords: { $push: { date: '$date', status: '$status', overtimeHours: '$overtimeHours' } },
      },
    },
    {
      $lookup: {
        from: 'workers',
        localField: '_id',
        foreignField: '_id',
        as: 'worker',
      },
    },
    { $unwind: '$worker' },
    {
      $lookup: {
        from: 'sites',
        localField: 'worker.siteId',
        foreignField: '_id',
        as: 'site',
      },
    },
    { $unwind: '$site' },
    {
      $addFields: {
        dailyRate: {
          $let: {
            vars: {
              rateObj: {
                $arrayElemAt: [
                  { $filter: {
                    input: '$site.wageRates',
                    as: 'wr',
                    cond: { $eq: ['$$wr.skill', '$worker.skill'] },
                  }},
                  0,
                ],
              },
            },
            in: { $ifNull: ['$$rateObj.dailyRate', '$worker.agreedRate'] },
          },
        },
        overtimeMultiplier: {
          $let: {
            vars: {
              rateObj: {
                $arrayElemAt: [
                  { $filter: {
                    input: '$site.wageRates',
                    as: 'wr',
                    cond: { $eq: ['$$wr.skill', '$worker.skill'] },
                  }},
                  0,
                ],
              },
            },
            in: { $ifNull: ['$$rateObj.overtimeRateMultiplier', 1.5] },
          },
        },
      },
    },
    {
      $project: {
        workerId: '$_id',
        workerName: '$worker.name',
        fatherName: '$worker.fatherName',
        skill: '$worker.skill',
        agreedRate: '$worker.agreedRate',
        dailyRate: 1,
        totalDays: 1,
        fullDays: 1,
        halfDays: 1,
        absentDays: 1,
        overtimeDays: 1,
        totalOvertimeHours: 1,
        basePay: { $multiply: ['$dailyRate', { $add: ['$fullDays', { $multiply: ['$halfDays', 0.5] }] }] },
        overtimePay: {
          $multiply: [
            { $multiply: ['$dailyRate', '$overtimeMultiplier'] },
            { $divide: ['$totalOvertimeHours', 8] },
          ],
        },
        attendanceRecords: 1,
        siteName: '$site.name',
      },
    },
    {
      $addFields: {
        grossPay: { $add: ['$basePay', '$overtimePay'] },
      },
    },
    { $sort: { workerName: 1 } },
  ]);
};

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
