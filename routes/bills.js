const express = require('express');
const router  = express.Router();
const { run, get, all, transaction, lastId } = require('../database');

const genBillNo = () => `B-${Date.now()}`;

// GET all bills
router.get('/', (req, res) => {
  try {
    const { dealer_id, status, date, limit = 50, offset = 0 } = req.query;
    let where = []; let params = [];
    if (dealer_id) { where.push('b.dealer_id=?');  params.push(dealer_id); }
    if (status)    { where.push('b.status=?');     params.push(status); }
    if (date)      { where.push('b.bill_date=?');  params.push(date); }
    const wc = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const bills = all(
      `SELECT b.*,d.name as dealer_name,d.area as dealer_area,d.dealer_code
       FROM bills b JOIN dealers d ON d.id=b.dealer_id ${wc}
       ORDER BY b.created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );
    res.json({ success: true, data: bills });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET single bill
router.get('/:id', (req, res) => {
  try {
    const bill = get(
      `SELECT b.*,d.name as dealer_name,d.area as dealer_area,d.dealer_code,
              d.phone as dealer_phone,d.address as dealer_address,d.gstin as dealer_gstin
       FROM bills b JOIN dealers d ON d.id=b.dealer_id
       WHERE b.id=? OR b.bill_no=?`,
      [req.params.id, req.params.id]
    );
    if (!bill) return res.status(404).json({ success: false, error: 'Bill not found' });
    const items    = all('SELECT * FROM bill_items WHERE bill_id=?', [bill.id]);
    const payments = all('SELECT * FROM payments WHERE bill_id=?', [bill.id]);
    const agency   = get('SELECT * FROM agency_info WHERE id=1');
    res.json({ success: true, data: { ...bill, items, payments, agency } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST create bill
router.post('/', (req, res) => {
  try {
    const { dealer_id, items, notes, bill_date } = req.body;
    if (!dealer_id) return res.status(400).json({ success: false, error: 'dealer_id required' });
    if (!items || !items.length) return res.status(400).json({ success: false, error: 'items required' });

    const dealer = get('SELECT * FROM dealers WHERE id=?', [dealer_id]);
    if (!dealer) return res.status(404).json({ success: false, error: 'Dealer not found' });

    // Enrich items
    let total_amount = 0;
    const enriched = [];
    for (const item of items) {
      const v = get(
        `SELECT pv.*,pg.name as product_name FROM product_variants pv
         JOIN product_groups pg ON pg.id=pv.group_id WHERE pv.id=?`,
        [item.variant_id]
      );
      if (!v) return res.status(400).json({ success: false, error: `Variant ${item.variant_id} not found` });
      const crates      = parseFloat(item.crates);
      const units       = parseFloat((crates * v.units_per_crate).toFixed(2));
      const total_price = parseFloat((units * v.price_per_unit).toFixed(2));
      total_amount += total_price;
      enriched.push({ variant_id: v.id, product_name: v.product_name, size_label: v.size_label,
                      crates, units, unit_price: v.price_per_unit, total_price });
    }
    total_amount = parseFloat(total_amount.toFixed(2));

    const bill_id = transaction(() => {
      const bill_no  = genBillNo();
      const bDate    = bill_date || new Date().toISOString().split('T')[0];
      run(`INSERT INTO bills (bill_no,dealer_id,bill_date,total_amount,paid_amount,status,notes)
           VALUES (?,?,?,?,0,'pending',?)`,
        [bill_no, dealer_id, bDate, total_amount, notes||null]);
      const bid = lastId();
      enriched.forEach(i => run(
        `INSERT INTO bill_items (bill_id,variant_id,product_name,size_label,crates,units,unit_price,total_price)
         VALUES (?,?,?,?,?,?,?,?)`,
        [bid, i.variant_id, i.product_name, i.size_label, i.crates, i.units, i.unit_price, i.total_price]
      ));
      run('UPDATE dealers SET balance=balance+? WHERE id=?', [total_amount, dealer_id]);
      return bid;
    });

    const bill    = get(`SELECT b.*,d.name as dealer_name,d.area as dealer_area,d.dealer_code FROM bills b JOIN dealers d ON d.id=b.dealer_id WHERE b.id=?`, [bill_id]);
    const outItems = all('SELECT * FROM bill_items WHERE bill_id=?', [bill_id]);
    const agency  = get('SELECT * FROM agency_info WHERE id=1');
    res.status(201).json({ success: true, data: { ...bill, items: outItems, agency } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// PATCH update status
router.patch('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending','paid','partial'].includes(status))
      return res.status(400).json({ success: false, error: 'Invalid status' });
    run('UPDATE bills SET status=? WHERE id=?', [status, req.params.id]);
    res.json({ success: true, message: 'Updated' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// DELETE bill
router.delete('/:id', (req, res) => {
  try {
    const bill = get('SELECT * FROM bills WHERE id=?', [req.params.id]);
    if (!bill) return res.status(404).json({ success: false, error: 'Not found' });
    transaction(() => {
      const due = bill.total_amount - bill.paid_amount;
      run('UPDATE dealers SET balance=balance-? WHERE id=?', [due, bill.dealer_id]);
      run('DELETE FROM bills WHERE id=?', [req.params.id]);
    });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
