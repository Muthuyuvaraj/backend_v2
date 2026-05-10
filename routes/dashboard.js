const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Dealer = require('../models/Dealer');
const Product = require('../models/Product');

function mongoKeyFromInvoice(o) {
  if (o.dealerMongoId) return String(o.dealerMongoId);
  const did = o.dealerId != null ? String(o.dealerId) : '';
  if (did && /^[a-f0-9]{24}$/i.test(did)) return did;
  return null;
}

router.get('/', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bills = await Invoice.find({
      status: { $ne: 'cancelled' },
      $or: [
        { createdAt: { $gte: today } },
        { createdAt: { $exists: false }, date: { $gte: today } },
      ],
    });

    const totalSales = bills.reduce((sum, b) => sum + (b.total || 0), 0);

    const pending = bills.reduce((sum, b) => sum + (b.pendingAmount || 0), 0);

    const dealers = await Dealer.countDocuments();
    const products = await Product.countDocuments();

    const recentBillsDocs = await Invoice.find({
      status: { $ne: 'cancelled' },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const rawDealerKeys = recentBillsDocs
      .map((o) => mongoKeyFromInvoice(o))
      .filter(Boolean);

    const objectIdsForDealers = [
      ...new Set(
        rawDealerKeys.filter((id) => mongoose.Types.ObjectId.isValid(id))
      ),
    ].map((id) => new mongoose.Types.ObjectId(id));

    const dealersFound =
      objectIdsForDealers.length > 0
        ? await Dealer.find({ _id: { $in: objectIdsForDealers } }).lean()
        : [];

    const dealerById = new Map(
      dealersFound.map((d) => [d._id.toString(), d])
    );

    const recentBills = recentBillsDocs.map((o) => {
      const key = mongoKeyFromInvoice(o);
      const d = key ? dealerById.get(key) : null;
      const resolved = d && typeof d.name === 'string';
      const created = o.createdAt || o.date;
      const dateStr = created
        ? new Date(created).toISOString().split('T')[0]
        : undefined;

      const {
        dealerMongoId: _dm,
        dealerId: _didSnap,
        dealerName: _dn,
        dealerPhone: _dp,
        dealerArea: _da,
        ...rest
      } = o;

      const nameFromSnapshot =
        o.dealerName && String(o.dealerName).trim()
          ? String(o.dealerName).trim()
          : '';
      const nameFromCustomer =
        o.customerName && String(o.customerName).trim()
          ? String(o.customerName).trim()
          : '';

      const dealerName =
        nameFromSnapshot ||
        (resolved ? d.name : '') ||
        nameFromCustomer ||
        'Unknown Store';
      const dealerPhone =
        (o.dealerPhone && String(o.dealerPhone)) ||
        (resolved ? d.phone : '') ||
        '';
      const dealerArea =
        (o.dealerArea && String(o.dealerArea)) ||
        (resolved ? d.area || '' : '') ||
        '';

      const businessDealerId =
        o.dealerId && !/^[a-f0-9]{24}$/i.test(String(o.dealerId))
          ? String(o.dealerId)
          : resolved && d.dealerId
            ? d.dealerId
            : null;

      const dealerMongoIdOut =
        o.dealerMongoId != null
          ? String(o.dealerMongoId)
          : key;

      return {
        ...rest,
        invoiceId: `INV-${o._id.toString()}`,
        dealerMongoId: dealerMongoIdOut,
        dealerId: businessDealerId,
        dealerName,
        dealerPhone,
        dealerArea,
        amount: o.total,
        createdAt: dateStr,
      };
    });

    res.json({
      totalSales,
      pending,
      dealers,
      products,
      recentBills,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
