/**
 * Idempotent upsert of the Curd product for MongoDB.
 * Run: npm run seed:curd
 */
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../models/Product');
const curdProductsMock = require('../data/curdProductsMock');

async function main() {
  await connectDB();
  const doc = {
    name: curdProductsMock.name,
    category: curdProductsMock.category,
    variants: curdProductsMock.variants.map((v) => {
      const x = { size: v.size, literPerCrate: v.literPerCrate };
      if (v.qtyPerCrate != null) x.qtyPerCrate = v.qtyPerCrate;
      if (v.ratePerCrate != null) x.ratePerCrate = v.ratePerCrate;
      if (v.ratePerLiter != null) x.ratePerLiter = v.ratePerLiter;
      return x;
    }),
  };
  const r = await Product.findOneAndUpdate(
    { name: doc.name, category: doc.category },
    { $set: doc },
    { upsert: true, new: true }
  );
  console.log('Curd product upserted:', r._id.toString());
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
