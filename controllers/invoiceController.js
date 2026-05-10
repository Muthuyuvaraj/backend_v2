const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Dealer = require('../models/Dealer');
const { enrichBillItemsForSave } = require('../utils/billItems');

const PAYMENT_METHODS = new Set(['cash', 'gpay', 'bank', 'none']);

/**
 * POST /api/mongo-bills — save dealer snapshot on every invoice (line items still normalized for milk/curd).
 */
exports.createInvoice = async (req, res) => {
  try {
    const body = req.body || {};
    const {
      dealerMongoId: dealerMongoIdBody,
      items,
      subtotal,
      total,
      paidAmount,
      customerName,
      paymentMethod,
    } = body;

    const dealerMongoId =
      dealerMongoIdBody ?? body.dealer?._id ?? body.dealer?.id ?? body.storeId;

    if (dealerMongoId == null || String(dealerMongoId).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'dealerMongoId is required (Dealer _id from GET /api/dealers)',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(String(dealerMongoId).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dealerMongoId',
      });
    }

    const dealer = await Dealer.findById(String(dealerMongoId).trim());

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: 'Dealer not found',
      });
    }

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'items must be an array',
      });
    }

    if (isNaN(Number(subtotal)) || isNaN(Number(total))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bill calculation',
      });
    }

    let normalizedItems;
    try {
      normalizedItems = enrichBillItemsForSave(items);
    } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }

    const subtotalNum = Number(subtotal);
    const totalNum = Number(total);
    const paid = Number(paidAmount);
    const paidSafe = Number.isFinite(paid) && paid >= 0 ? paid : 0;

    if (paidSafe > totalNum) {
      return res.status(400).json({
        success: false,
        message: 'paidAmount cannot exceed total',
      });
    }

    const pendingAmount = totalNum - paidSafe;

    let paymentStatus = 'pending';
    if (paidSafe >= totalNum && totalNum > 0) paymentStatus = 'paid';
    else if (paidSafe > 0) paymentStatus = 'partial';

    let method =
      paymentMethod != null && String(paymentMethod) !== ''
        ? String(paymentMethod)
        : 'cash';
    if (!PAYMENT_METHODS.has(method)) method = 'cash';

    const customerNameFinal =
      customerName != null && String(customerName).trim() !== ''
        ? String(customerName).trim()
        : dealer.name;

    const invoice = new Invoice({
      dealerMongoId: dealer._id,
      dealerId: dealer.dealerId,
      dealerName: dealer.name,
      dealerPhone: dealer.phone,
      dealerArea: dealer.area || '',

      customerName: customerNameFinal,
      items: normalizedItems,
      subtotal: subtotalNum,
      total: totalNum,

      paidAmount: paidSafe,
      pendingAmount,

      paymentStatus,
      paymentMethod: method,
      status: 'active',
      date: new Date(),
    });

    await invoice.save();

    res.status(201).json({
      success: true,
      invoice,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
