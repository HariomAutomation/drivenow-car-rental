/* PATCH /api/bookings/:ref/cancel — cancel a booking. Auth required.
 * Rules: booking must belong to the caller, be CONFIRMED, and its pickup date
 * must still be in the future (free cancellation until 24h before pickup).
 * 200 { booking } | 400 not cancellable | 401 unauthorized | 404 not found
 */
const pool = require('../../../lib/db');
const { verifyAuth } = require('../../../lib/auth');
const { sendError } = require('../../../lib/helpers');

module.exports = async (req, res) => {
  try {
    const auth = verifyAuth(req);
    if (!auth) return sendError(res, 401, 'Authentication required. Send Authorization: Bearer <token>.');

    if (req.method !== 'PATCH') return sendError(res, 405, 'Method not allowed');

    const { ref } = req.query || {};
    if (!ref) return sendError(res, 400, 'Missing booking reference');

    const { rows } = await pool.query(
      `SELECT booking_ref, user_id, status, from_date FROM bookings WHERE booking_ref = $1`, [ref]);
    const booking = rows[0];
    if (!booking || booking.user_id !== auth.sub)
      return sendError(res, 404, 'Booking not found');

    if (booking.status !== 'CONFIRMED')
      return sendError(res, 400, `Booking is already ${booking.status.toLowerCase()} — only confirmed bookings can be cancelled`);

    const today = new Date().toISOString().slice(0, 10);
    if (booking.from_date <= today)
      return sendError(res, 400, 'This booking can no longer be cancelled (pickup date has arrived)');

    const updated = await pool.query(
      `UPDATE bookings SET status = 'CANCELLED' WHERE booking_ref = $1
       RETURNING booking_ref AS "bookingRef", car_id AS "carId", city,
                 from_date AS "fromDate", to_date AS "toDate", days, extras, coupon,
                 base, extras_total AS "extrasTotal", discount, gst, total, status,
                 booked_at AS "bookedAt"`, [ref]);

    res.status(200).json({ booking: updated.rows[0] });
  } catch (err) {
    console.error('PATCH /api/bookings/:ref/cancel failed:', err.message);
    sendError(res, 500, 'Internal server error');
  }
};
