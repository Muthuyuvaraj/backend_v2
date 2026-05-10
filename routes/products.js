const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Create product
router.post('/', async (req, res) => {
  try {
    const product = new Product(req.body);
    const saved = await product.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add variant to product
router.put('/:id/variant', async (req, res) => {
  try {
    const {
      size,
      litersPerCrate,
      price,
      qtyPerCrate,
      literPerCrate,
      ratePerCrate,
      ratePerLiter,
    } = req.body;

    const variant = { size };
    if (litersPerCrate != null) variant.litersPerCrate = litersPerCrate;
    if (price != null) variant.price = price;
    if (qtyPerCrate != null) variant.qtyPerCrate = qtyPerCrate;
    if (literPerCrate != null) variant.literPerCrate = literPerCrate;
    if (ratePerCrate != null) variant.ratePerCrate = ratePerCrate;
    if (ratePerLiter != null) variant.ratePerLiter = ratePerLiter;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          variants: variant,
        },
      },
      { returnDocument: 'after' }
    );

    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
