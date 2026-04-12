const mongoose = require('mongoose');
const crypto   = require('crypto');

// Auto-generate short display ID: WI-XXXXXXXX
const generateWalkInId = () => {
  const digits = Math.floor(10000000 + Math.random() * 90000000);
  return `WI-${digits}`;
};

const walkInOrderSchema = new mongoose.Schema({
  walkInId: {
    type: String,
    unique: true,
  },
  transactionId: {
    type: String,
    unique: true,
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  customerName: {
    type: String,
    default: 'Walk-in Customer',
    trim: true,
  },
  tableNumber: {
    type: String,
    default: 'N/A',
    trim: true,
  },
  items: [
    {
      name:     { type: String, required: true },
      price:    { type: Number, required: true },
      quantity: { type: Number, required: true, min: 1 },
    },
  ],
  subtotal:  { type: Number, required: true },
  tax:       { type: Number, required: true }, // 18% GST
  grandTotal:{ type: Number, required: true },
  source:    { type: String, default: 'walk-in', immutable: true },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending',
  },
  paidAt:          { type: Date },
  billGeneratedAt: { type: Date },
}, { timestamps: true });

// Auto-generate IDs before saving
walkInOrderSchema.pre('save', async function (next) {
  if (!this.walkInId) {
    let id, exists;
    do {
      id = generateWalkInId();
      exists = !!(await mongoose.model('WalkInOrder').findOne({ walkInId: id }));
    } while (exists);
    this.walkInId = id;
  }
  if (!this.transactionId) {
    this.transactionId = `TXN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }
  next();
});

module.exports = mongoose.model('WalkInOrder', walkInOrderSchema);
