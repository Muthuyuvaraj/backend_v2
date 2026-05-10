const { calculateCurdBill } = require('./curdBilling');

function isCurdBillItem(item) {
  if (!item || typeof item !== 'object') return false;
  if (String(item.category).toLowerCase() === 'curd') return true;
  return (
    item.crates != null &&
    item.literPerCrate != null &&
    (item.ratePerCrate != null || item.ratePerLiter != null)
  );
}

/**
 * Milk items unchanged. Curd lines get crates, totalLiter, rate, totalAmount from {@link calculateCurdBill}.
 */
function enrichBillItemsForSave(items) {
  if (!Array.isArray(items)) return items;
  return items.map((item) => {
    if (!isCurdBillItem(item)) return { ...item };

    const crates = Number(item.crates);
    const literPerCrate = Number(item.literPerCrate);
    const ratePerCrate =
      item.ratePerCrate != null && item.ratePerCrate !== ''
        ? Number(item.ratePerCrate)
        : null;
    const ratePerLiter =
      item.ratePerLiter != null && item.ratePerLiter !== ''
        ? Number(item.ratePerLiter)
        : null;

    if (!Number.isFinite(literPerCrate) || literPerCrate <= 0) {
      throw new Error('Curd line requires valid literPerCrate');
    }

    const computed = calculateCurdBill({
      crates,
      literPerCrate,
      ratePerCrate:
        ratePerCrate != null && Number.isFinite(ratePerCrate)
          ? ratePerCrate
          : undefined,
      ratePerLiter:
        ratePerLiter != null && Number.isFinite(ratePerLiter)
          ? ratePerLiter
          : undefined,
    });

    const qtyPerCrate =
      item.qtyPerCrate != null && item.qtyPerCrate !== ''
        ? Number(item.qtyPerCrate)
        : undefined;

    const row = {
      name: item.name,
      size: item.size,
      category: item.category || 'Curd',
      crates: computed.crates,
      literPerCrate,
      totalLiter: computed.totalLiter,
      rate: computed.rate,
      totalAmount: computed.totalAmount,
    };
    if (qtyPerCrate != null && Number.isFinite(qtyPerCrate)) {
      row.qtyPerCrate = qtyPerCrate;
    }
    if (ratePerCrate != null && Number.isFinite(ratePerCrate)) {
      row.ratePerCrate = ratePerCrate;
    }
    if (ratePerLiter != null && Number.isFinite(ratePerLiter)) {
      row.ratePerLiter = ratePerLiter;
    }
    return row;
  });
}

module.exports = {
  isCurdBillItem,
  enrichBillItemsForSave,
};
