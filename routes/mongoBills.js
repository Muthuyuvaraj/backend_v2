const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const { formatMongoBillThermalText } = require('../utils/thermalInvoice');
const invoiceController = require('../controllers/invoiceController');

// Create invoice (dealer snapshot on document)
router.post('/', invoiceController.createInvoice);

// Thermal print layout (UTF-8 plain text; milk + curd lines)
router.get('/:id/thermal', async (req, res) => {
  try {
    const bill = await Invoice.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    const text = formatMongoBillThermalText(bill.toObject());
    res.type('text/plain; charset=utf-8').send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const bill = await Invoice.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel bill
router.put('/:id/cancel', async (req, res) => {
  try {
    const bill = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { returnDocument: 'after' }
    );

    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
