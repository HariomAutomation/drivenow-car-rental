/* GET /api/cars — fleet listing with server-side filters.
 * Query params: city, type, seats, sort (rating|price-asc|price-desc), from, to (ISO dates)
 * Date availability: cars with a CONFIRMED booking overlapping [from, to) are excluded.
 */
const pool = require('../lib/db');
const { sendError } = require('../lib/helpers');

module.exports = async (req, res) => {
  try {
    const { city, type, seats, sort, from, to } = req.query || {};

    const params = [];
    const where = [];

    if (city) { params.push(city); where.push(`$${params.length} = ANY(cities)`); }
    if (type) { params.push(type); where.push(`type = $${params.length}`); }
    if (seats && !Number.isNaN(parseInt(seats, 10))) {
      params.push(parseInt(seats, 10)); where.push(`seats >= $${params.length}`);
    }
    if (from && to) {
      params.push(from, to);
      where.push(`NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.car_id = cars.id
          AND b.status = 'CONFIRMED'
          AND b.from_date < $${params.length}
          AND b.to_date > $${params.length - 1}
      )`);
    }

    const orderBy = sort === 'price-asc' ? 'price_per_day ASC'
      : sort === 'price-desc' ? 'price_per_day DESC'
      : 'rating DESC, trips DESC';

    const sql = `SELECT id, brand, model, type, seats, fuel, transmission, price_per_day AS "pricePerDay",
                        cities, color, rating::float8 AS rating, trips
                 FROM cars ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                 ORDER BY ${orderBy}`;
    const { rows } = await pool.query(sql, params);

    res.status(200).json({ total: rows.length, cars: rows });
  } catch (err) {
    console.error('GET /api/cars failed:', err.message);
    sendError(res, 500, 'Internal server error');
  }
};
