const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');

router.get('/', async (req, res) => {
  try {
    const { range } = req.query;

    let startDate = new Date();

    if (range === 'daily') {
      startDate.setHours(0, 0, 0, 0);
    } else if (range === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (range === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (range === 'quarterly') {
      startDate.setMonth(startDate.getMonth() - 3);
    } else if (range === 'halfyearly') {
      startDate.setMonth(startDate.getMonth() - 6);
    } else {
      startDate.setHours(0, 0, 0, 0);
    }

    const bills = await Invoice.find({
      status: { $ne: 'cancelled' },
      $or: [
        { createdAt: { $gte: startDate } },
        {
          createdAt: { $exists: false },
          date: { $gte: startDate },
        },
      ],
    });

    const totalSales = bills.reduce((sum, b) => sum + (b.total || 0), 0);

    const outstanding = bills.reduce(
      (sum, b) => sum + (b.pendingAmount || 0),
      0
    );

    const totalCrates = bills.reduce((sum, b) => {
      return (
        sum +
        (b.items || []).reduce((s, i) => {
          const fromCrates = i.crates != null ? Number(i.crates) : NaN;
          const crateQty = Number.isFinite(fromCrates)
            ? fromCrates
            : Number(i.qty) || 0;
          return s + crateQty;
        }, 0)
      );
    }, 0);

    const totalLiters = bills.reduce((sum, b) => {
      return (
        sum +
        (b.items || []).reduce((s, i) => {
          const tl = Number(i.totalLiter);
          if (Number.isFinite(tl)) return s + tl;
          const q = Number(i.qty) || 0;
          const l = Number(i.litersPerCrate) || 0;
          return s + q * l;
        }, 0)
      );
    }, 0);

    res.json({
      totalSales,
      outstanding,
      totalCrates,
      totalLiters,
      revenue: totalSales,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
