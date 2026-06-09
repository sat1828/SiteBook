import mongoose from 'mongoose';

const wageRateSchema = new mongoose.Schema({
  skill: {
    type: String,
    enum: ['unskilled', 'semi_skilled', 'skilled', 'highly_skilled'],
    required: true,
  },
  dailyRate: {
    type: Number,
    required: true,
    min: 0,
  },
  overtimeRateMultiplier: {
    type: Number,
    default: 1.5,
    min: 1,
  },
}, { _id: false });

const siteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Site name is required'],
    trim: true,
    maxlength: 200,
  },
  contractorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: [true, 'GPS coordinates are required'],
      validate: {
        validator(v) {
          return v.length === 2
            && v[0] >= -180 && v[0] <= 180
            && v[1] >= -90 && v[1] <= 90;
        },
        message: 'Invalid coordinates [lng, lat]',
      },
    },
    address: {
      type: String,
      trim: true,
    },
    radius: {
      type: Number,
      default: 200,
      min: 10,
      max: 10000,
    },
  },
  wageRates: {
    type: [wageRateSchema],
    required: true,
    validate: {
      validator(v) { return v.length > 0; },
      message: 'At least one wage rate is required',
    },
  },
  budget: {
    type: Number,
    default: 0,
    min: 0,
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'on_hold'],
    default: 'active',
  },
  supervisors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  materialLowStockThreshold: {
    type: Number,
    default: 10,
    min: 0,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

siteSchema.index({ location: '2dsphere' });
siteSchema.index({ contractorId: 1, status: 1 });

siteSchema.virtual('workerCount', {
  ref: 'Worker',
  localField: '_id',
  foreignField: 'siteId',
  count: true,
});

const Site = mongoose.model('Site', siteSchema);
export default Site;
