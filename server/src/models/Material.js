import mongoose from 'mongoose';

const materialTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['inward', 'outward'],
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  rate: {
    type: Number,
    min: 0,
  },
  totalCost: {
    type: Number,
    min: 0,
  },
  supplier: { type: String, trim: true },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  notes: String,
  date: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const materialSchema = new mongoose.Schema({
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
  name: {
    type: String,
    required: [true, 'Material name is required'],
    trim: true,
  },
  sku: {
    type: String,
    trim: true,
  },
  unit: {
    type: String,
    required: true,
    enum: ['bags', 'kg', 'tonnes', 'units', 'pieces', 'litres', 'cubic_metre', 'truckload'],
  },
  currentStock: {
    type: Number,
    default: 0,
    min: 0,
  },
  lowStockThreshold: {
    type: Number,
    default: 10,
    min: 0,
  },
  transactions: [materialTransactionSchema],
  industryWastageBenchmark: {
    type: Number,
    default: 5,
    min: 0,
    max: 100,
  },
}, {
  timestamps: true,
});

materialSchema.index({ siteId: 1, name: 1 }, { unique: true });

materialSchema.virtual('totalInward').get(function () {
  return this.transactions
    .filter(t => t.type === 'inward')
    .reduce((sum, t) => sum + t.quantity, 0);
});

materialSchema.virtual('totalOutward').get(function () {
  return this.transactions
    .filter(t => t.type === 'outward')
    .reduce((sum, t) => sum + t.quantity, 0);
});

materialSchema.virtual('wastagePercent').get(function () {
  const inward = this.totalInward;
  const outward = this.totalOutward;
  if (inward === 0) return 0;
  return Math.max(0, ((inward - outward - this.currentStock) / inward) * 100);
});

const Material = mongoose.model('Material', materialSchema);
export default Material;
