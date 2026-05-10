const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  name: String,
  size: String,
  category: String,
  /** Milk: crate qty */
  qty: Number,
  price: Number,
  litersPerCrate: Number,

  /** Curd */
  qtyPerCrate: Number,
  literPerCrate: Number,
  ratePerCrate: Number,
  ratePerLiter: Number,
  crates: Number,
  totalLiter: Number,
  rate: Number,
  totalAmount: Number,
});

const InvoiceSchema = new mongoose.Schema(
  {
    /** Selected dealer document _id */
    dealerMongoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dealer',
    },
    /** Business dealer code (e.g. A-101) — snapshot at invoice time */
    dealerId: String,
    dealerName: String,
    dealerPhone: String,
    dealerArea: String,

    customerName: String,
    items: [ItemSchema],
    subtotal: Number,
    total: Number,

    paidAmount: {
      type: Number,
      default: 0,
    },

    pendingAmount: {
      type: Number,
      default: 0,
    },

    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'paid'],
      default: 'pending',
    },

    paymentMethod: {
      type: String,
      enum: ['cash', 'gpay', 'bank', 'none'],
      default: 'none',
    },

    status: {
      type: String,
      enum: ['active', 'cancelled'],
      default: 'active',
    },

    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

/** Keeps using existing MongoDB `bills` collection */
module.exports = mongoose.model('Invoice', InvoiceSchema, 'bills');
