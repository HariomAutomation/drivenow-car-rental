/*
 * Fare engine + business rules — server is the single source of truth.
 *
 *   base     = pricePerDay * days
 *   extras   = sum(perDay * days) + flat fees
 *   discount = coupon: 10% of BASE, capped at 500 (0 if no coupon)
 *   gst      = 18% of (base - discount + extras)
 *   total    = base - discount + extras + gst
 */
const EXTRAS = [
  { id: 'gps', label: 'GPS Navigation', perDay: 150, flat: 0 },
  { id: 'childSeat', label: 'Child Seat', perDay: 100, flat: 0 },
  { id: 'insurance', label: 'Zero-Dep Insurance', perDay: 0, flat: 299 }
];

const RULES = {
  maxRentalDays: 30,
  gstPercent: 18,
  coupon: { code: 'DRIVE10', percentOffBase: 10, maxDiscount: 500 }
};

function isValidCoupon(code) {
  return (code || '').trim().toUpperCase() === RULES.coupon.code;
}

function calculateFare(pricePerDay, days, extras, couponCode) {
  const base = pricePerDay * days;

  let extrasTotal = 0;
  const extrasDetail = [];
  (extras || []).forEach(id => {
    const ex = EXTRAS.find(e => e.id === id);
    if (!ex) return;
    const amount = ex.perDay * days + ex.flat;
    extrasTotal += amount;
    extrasDetail.push({ id: ex.id, label: ex.label, amount });
  });

  let discount = 0;
  const code = (couponCode || '').trim().toUpperCase();
  if (code === RULES.coupon.code) {
    discount = Math.min(Math.round(base * RULES.coupon.percentOffBase / 100), RULES.coupon.maxDiscount);
  }

  const taxable = base - discount + extrasTotal;
  const gst = Math.round(taxable * RULES.gstPercent / 100);
  const total = base - discount + extrasTotal + gst;

  return { base, extrasTotal, extrasDetail, discount, gst, total, couponApplied: discount > 0 };
}

module.exports = { EXTRAS, RULES, calculateFare, isValidCoupon };
