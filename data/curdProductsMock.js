/**
 * Curd catalog (simple billing — no GST). Matches Mongo Product/variant shape.
 */
module.exports = {
  name: 'Curd',
  category: 'Curd',
  variants: [
    {
      size: '125g',
      qtyPerCrate: 90,
      literPerCrate: 11,
      ratePerCrate: 704,
    },
    {
      size: '475g',
      qtyPerCrate: 28,
      literPerCrate: 11,
      ratePerLiter: 64,
    },
    {
      size: '1kg',
      qtyPerCrate: 12,
      literPerCrate: 12,
      ratePerLiter: 64,
    },
  ],
};
