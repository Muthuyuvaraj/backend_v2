/**
 * Simple curd billing — no GST. Prefer ratePerCrate when set; else ratePerLiter + literPerCrate.
 */

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

/**
 * @param {object} params
 * @param {number|string} params.crates
 * @param {number|string} params.literPerCrate
 * @param {number|string} [params.ratePerCrate]
 * @param {number|string} [params.ratePerLiter]
 * @returns {{ crates: number, totalLiter: number|null, rate: number, totalAmount: number }}
 */
function calculateCurdBill({ crates, literPerCrate, ratePerCrate, ratePerLiter }) {
  const c = Number(crates);
  if (!Number.isFinite(c) || c < 0) {
    throw new Error('Curd line requires valid crates');
  }

  const lpc =
    literPerCrate != null && literPerCrate !== ''
      ? Number(literPerCrate)
      : null;

  const rpc =
    ratePerCrate != null && ratePerCrate !== ''
      ? Number(ratePerCrate)
      : null;
  const rpl =
    ratePerLiter != null && ratePerLiter !== ''
      ? Number(ratePerLiter)
      : null;

  if (rpc != null && Number.isFinite(rpc)) {
    let totalLiter = null;
    if (lpc != null && Number.isFinite(lpc) && lpc > 0) {
      totalLiter = roundMoney(c * lpc);
    }
    const totalAmount = roundMoney(c * rpc);
    return { crates: c, totalLiter, rate: rpc, totalAmount };
  }

  if (rpl != null && Number.isFinite(rpl)) {
    if (lpc == null || !Number.isFinite(lpc) || lpc <= 0) {
      throw new Error('Curd rate-per-liter pricing requires literPerCrate');
    }
    const totalLiter = roundMoney(c * lpc);
    const totalAmount = roundMoney(totalLiter * rpl);
    return { crates: c, totalLiter, rate: rpl, totalAmount };
  }

  throw new Error('Curd line requires ratePerCrate or ratePerLiter');
}

module.exports = {
  calculateCurdBill,
  roundMoney,
};
