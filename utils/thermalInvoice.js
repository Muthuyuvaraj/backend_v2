/**
 * Plain-text layout for 58/80mm thermal printers (UTF-8). Milk lines unchanged; curd uses crates/totalLiter/rate/totalAmount.
 */

function money(n) {
  if (n == null || !Number.isFinite(Number(n))) return '-';
  return Number(n).toFixed(2);
}

function isCurdItemForThermal(it) {
  return (
    it &&
    it.crates != null &&
    it.rate != null &&
    it.totalAmount != null &&
    (it.totalLiter != null || it.ratePerCrate != null || it.ratePerLiter != null)
  );
}

/**
 * @param {object} bill — plain object (e.g. doc.toObject())
 * @returns {string}
 */
function formatMongoBillThermalText(bill) {
  const w = 32;
  const line = (s) => String(s || '').slice(0, w);
  const rows = [];

  rows.push(line('VIGNESH AGENCY'));
  rows.push(line('----------------'));
  if (bill.customerName) rows.push(line(bill.customerName));
  if (bill._id) rows.push(line(String(bill._id)));
  if (bill.createdAt) {
    const d = new Date(bill.createdAt);
    rows.push(line(d.toLocaleString()));
  }
  rows.push(line('----------------'));

  for (const it of bill.items || []) {
    if (isCurdItemForThermal(it)) {
      rows.push(line(`${it.name || 'Curd'} ${it.size || ''}`.trim()));
      rows.push(
        line(
          `Cr:${it.crates} L:${it.totalLiter != null ? money(it.totalLiter) : '-'} R:${money(it.rate)}`
        )
      );
      rows.push(line(`Amt: ${money(it.totalAmount)}`));
    } else {
      const q = Number(it.qty) || 0;
      const lpc = Number(it.litersPerCrate) || 0;
      const pr = Number(it.price) || 0;
      const amt = round2(q * lpc * pr);
      rows.push(line(`${it.name || ''} ${it.size || ''}`.trim()));
      rows.push(line(`Cr:${q} ${lpc}L @${money(pr)}`));
      rows.push(line(`Amt: ${money(amt)}`));
    }
    rows.push(line(''));
  }

  rows.push(line('----------------'));
  rows.push(line(`Subtotal: ${money(bill.subtotal)}`));
  rows.push(line(`Total: ${money(bill.total)}`));
  if (bill.paidAmount != null && Number(bill.paidAmount) > 0) {
    rows.push(line(`Paid: ${money(bill.paidAmount)}`));
    rows.push(line(`Pending: ${money(bill.pendingAmount)}`));
  }
  rows.push(line('----------------'));
  rows.push('');
  return rows.join('\n');
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

module.exports = {
  formatMongoBillThermalText,
};
