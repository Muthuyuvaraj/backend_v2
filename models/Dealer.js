const mongoose = require('mongoose');

const DealerSchema = new mongoose.Schema({
  dealerId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    maxlength: 50,
    required: true,
  },
  phone: {
    type: String,
    match: /^\d{10}$/,
    required: true,
  },
  area: {
    type: String,
    maxlength: 100,
  },
  openingBalance: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Dealer', DealerSchema);
