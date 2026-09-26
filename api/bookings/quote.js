/* POST /api/bookings/quote — fare quote without creating a booking (no auth needed).
 * Body: { carId, fromDate, toDate, extras: [], coupon }
 * 200 { days, base, extrasTotal, extrasDetail, discount, gst, total, carAvailable }
 * 400 invalid input | 404 car not found
 */
const pool = require('../../lib/db');
const { calculateFare } = require('../../lib/fare');
const { getBody, sendError } = require('../../lib/helpers');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_EXTRAS = ['gps', 'childSeat', 'insurance'];

module.exports = async (req, res) => {
  try {
    const { carId, fromDate, toDate, extras, coupon } = getBody(req);

    if (!carId) return sendError(res, 400, 'carId is required');
    if (!fromDate || !toDate || !ISO_DATE.test(fromDate) || !ISO_DATE.test(toDate))
      return sendError(res, 400, 'fromDate and toDate must be valid ISO dates (YYYY-MM-DD)');

    const { rows } = await pool.query('SELECT id, price_per_day FROM cars WHERE id = $1', [carId]);
    const car = rows[0];
    if (!car) return sendError(res, 404, 'Car not found');

    if (toDate <= fromDate) return sendError(res, 400, 'toDate must be after fromDate');

    const days = Math.round((new Date(toDate) - new Date(fromDate)) / 86400000);
    if (days > 30) return sendError(res, 400, 'Bookings longer than 30 days are not allowed');

    const extrasList = Array.isArray(extras) ? extras.filter(e => VALID_EXTRAS.includes(e)) : [];

    // Overlap check (same rule as booking creation)
    const overlap = await pool.query(
      `SELECT 1 FROM bookings
       WHERE car_id = $1 AND status = 'CONFIRMED' AND from_date < $3 AND to_date > $2`,
      [carId, fromDate, toDate]);
    const carAvailable = overlap.rows.length === 0;

    const fare = calculateFare(car.price_per_day, days, extrasList, coupon);
    res.status(200).json({ days, ...fare, carAvailable });
  } catch (err) {
    console.error('POST /api/bookings/quote failed:', err.message);
    sendError(res, 500, 'Internal server error');
  }
};
