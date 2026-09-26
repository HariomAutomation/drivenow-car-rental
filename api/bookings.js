/* /api/bookings
 * GET  — list the logged-in user's bookings (newest first). Auth required.
 * POST — create a booking. Auth required.
 *       Body: { carId, city, fromDate, toDate, extras: [], coupon }
 *       201 { booking } | 400 validation | 401 unauthorized | 404 car | 409 date overlap
 */
const pool = require('../lib/db');
const { verifyAuth } = require('../lib/auth');
const { calculateFare, isValidCoupon, RULES } = require('../lib/fare');
const { getBody, sendError } = require('../lib/helpers');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_EXTRAS = ['gps', 'childSeat', 'insurance'];

function generateRef() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = '';
  for (let i = 0; i < 6; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  return 'DT-' + ref;
}

function todayISO() {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

module.exports = async (req, res) => {
  try {
    const auth = verifyAuth(req);
    if (!auth) return sendError(res, 401, 'Authentication required. Send Authorization: Bearer <token>.');

    /* ---------- GET: my bookings ---------- */
    if (req.method === 'GET') {
      const { rows } = await pool.query(
        `SELECT b.booking_ref AS "bookingRef", b.car_id AS "carId",
                c.brand || ' ' || c.model AS "carName", b.city,
                b.from_date AS "fromDate", b.to_date AS "toDate", b.days,
                b.extras, b.coupon, b.base, b.extras_total AS "extrasTotal",
                b.discount, b.gst, b.total, b.status, b.booked_at AS "bookedAt"
         FROM bookings b JOIN cars c ON c.id = b.car_id
         WHERE b.user_id = $1
         ORDER BY b.booked_at DESC`, [auth.sub]);
      return res.status(200).json({ total: rows.length, bookings: rows });
    }

    /* ---------- POST: create booking ---------- */
    if (req.method === 'POST') {
      const { carId, city, fromDate, toDate, extras, coupon } = getBody(req);

      if (!carId) return sendError(res, 400, 'carId is required');
      if (!fromDate || !toDate || !ISO_DATE.test(fromDate) || !ISO_DATE.test(toDate))
        return sendError(res, 400, 'fromDate and toDate must be valid ISO dates (YYYY-MM-DD)');

      const { rows } = await pool.query('SELECT id, cities, price_per_day FROM cars WHERE id = $1', [carId]);
      const car = rows[0];
      if (!car) return sendError(res, 404, 'Car not found');

      if (!city || !car.cities.includes(city))
        return sendError(res, 400, 'Pickup city must be one where this car is offered');

      if (fromDate < todayISO()) return sendError(res, 400, 'fromDate cannot be in the past');
      if (toDate <= fromDate) return sendError(res, 400, 'toDate must be after fromDate');

      const days = Math.round((new Date(toDate) - new Date(fromDate)) / 86400000);
      if (days > RULES.maxRentalDays)
        return sendError(res, 400, `Bookings longer than ${RULES.maxRentalDays} days are not allowed`);

      const extrasList = Array.isArray(extras) ? extras.filter(e => VALID_EXTRAS.includes(e)) : [];
      const couponCode = (coupon || '').trim().toUpperCase();
      if (couponCode && !isValidCoupon(couponCode))
        return sendError(res, 400, 'Invalid coupon code');

      // Overlap check — a car can have only one CONFIRMED booking for a date range
      const overlap = await pool.query(
        `SELECT booking_ref FROM bookings
         WHERE car_id = $1 AND status = 'CONFIRMED' AND from_date < $3 AND to_date > $2`,
        [carId, fromDate, toDate]);
      if (overlap.rows.length > 0)
        return sendError(res, 409, 'This car is already booked for the selected dates');

      const fare = calculateFare(car.price_per_day, days, extrasList, couponCode);
      const ref = generateRef();

      const inserted = await pool.query(
        `INSERT INTO bookings (booking_ref, user_id, car_id, city, from_date, to_date, days,
                               extras, coupon, base, extras_total, discount, gst, total, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'CONFIRMED')
         RETURNING booking_ref AS "bookingRef", car_id AS "carId", city,
                   from_date AS "fromDate", to_date AS "toDate", days, extras, coupon,
                   base, extras_total AS "extrasTotal", discount, gst, total, status,
                   booked_at AS "bookedAt"`,
        [ref, auth.sub, carId, city, fromDate, toDate, days,
         extrasList, fare.couponApplied ? couponCode : '',
         fare.base, fare.extrasTotal, fare.discount, fare.gst, fare.total]);

      const booking = inserted.rows[0];
      booking.carName = undefined;
      return res.status(201).json({ booking });
    }

    return sendError(res, 405, 'Method not allowed');
  } catch (err) {
    console.error('/api/bookings failed:', err.message);
    sendError(res, 500, 'Internal server error');
  }
};
