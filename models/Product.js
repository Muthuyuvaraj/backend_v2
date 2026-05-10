const mongoose = require('mongoose');

const VariantSchema = new mongoose.Schema({
  size: String,
  /** Milk: liters per crate; price = rate per liter */
  litersPerCrate: Number,
  price: Number,

  /** Curd: pieces per crate (e.g. 90 for 125g) */
  qtyPerCrate: Number,
  /** Curd: total liters per crate */
  literPerCrate: Number,
  /** Curd: if set, line total = crates × ratePerCrate */
  ratePerCrate: Number,
  /** Curd: if set (and no ratePerCrate), totalLiter = crates × literPerCrate; total = totalLiter × ratePerLiter */
  ratePerLiter: Number,
});

const ProductSchema = new mongoose.Schema({
  name: String,
  category: String,
  variants: [VariantSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Product', ProductSchema);
