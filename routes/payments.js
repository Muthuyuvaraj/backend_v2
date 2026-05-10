const express = require('express');
const router  = express.Router();
const { run, get, all, transaction, lastId } = require('../database');

// POST record payment
router.post('/', (req, res) => {
  try {
    const { dealer_id, bill_id, amount, mode, note } = req.body;
    if (!dealer_id || !amount)
      return res.status(400).json({ success: false, error: 'dealer_id and amount required' });

    const pay_id = transaction(() => {
      run(`INSERT INTO payments (dealer_id,bill_id,amount,mode,note) VALUES (?,?,?,?,?)`,
        [dealer_id, bill_id||null, parseFloat(amount), mode||'cash', note||null]);
      const pid = lastId();

      // Reduce dealer balance
      run('UPDATE dealers SET balance=MAX(0,balance-?) WHERE id=?', [parseFloat(amount), dealer_id]);

      // Update linked bill
      if (bill_id) {
        const bill = get('SELECT * FROM bills WHERE id=?', [bill_id]);
        if (bill) {
          const new_paid = parseFloat((Number(bill.paid_amount) + parseFloat(amount)).toFixed(2));
          const status   = new_paid >= Number(bill.total_amount) ? 'paid' : new_paid > 0 ? 'partial' : 'pending';
          run('UPDATE bills SET paid_amount=?,status=? WHERE id=?', [new_paid, status, bill_id]);
        }
      }
      return pid;
    });

    res.status(201).json({ success: true, data: get('SELECT * FROM payments WHERE id=?', [pay_id]) });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET payments for dealer
router.get('/dealer/:dealer_id', (req, res) => {
  try {
    const payments = all(
      `SELECT p.*,b.bill_no FROM payments p LEFT JOIN bills b ON b.id=p.bill_id
       WHERE p.dealer_id=? ORDER BY p.paid_at DESC`,
      [req.params.dealer_id]
    );
    res.json({ success: true, data: payments });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET recent payments
router.get('/', (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const payments = all(
      `SELECT p.*,d.name as dealer_name,b.bill_no FROM payments p
       JOIN dealers d ON d.id=p.dealer_id LEFT JOIN bills b ON b.id=p.bill_id
       ORDER BY p.paid_at DESC LIMIT ?`,
      [Number(limit)]
    );
    res.json({ success: true, data: payments });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
