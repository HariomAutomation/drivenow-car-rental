/* GET /api/cars/:id — single car by id. 404 if not found. */
const pool = require('../../lib/db');
const { sendError } = require('../../lib/helpers');

module.exports = async (req, res) => {
  try {
    const { id } = req.query || {};
    if (!id) return sendError(res, 400, 'Missing car id');

    const { rows } = await pool.query(
      `SELECT id, brand, model, type, seats, fuel, transmission, price_per_day AS "pricePerDay",
              cities, color, rating::float8 AS rating, trips
       FROM cars WHERE id = $1`, [id]);

    if (rows.length === 0) return sendError(res, 404, 'Car not found');
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error('GET /api/cars/:id failed:', err.message);
    sendError(res, 500, 'Internal server error');
  }
};
