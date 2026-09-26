/* POST /api/auth/register — create account, returns JWT.
 * Body: { name, email, phone, city, password }
 * 201 { token, user } | 400 validation | 409 email already exists
 */
const bcrypt = require('bcryptjs');
const pool = require('../../lib/db');
const { signToken } = require('../../lib/auth');
const { getBody, sendError } = require('../../lib/helpers');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CITIES = ['delhi', 'mumbai', 'bangalore', 'pune', 'jaipur'];

module.exports = async (req, res) => {
  try {
    const { name, email, phone, city, password } = getBody(req);

    const errors = [];
    if (!name || name.trim().length < 3) errors.push('Name must be at least 3 characters');
    if (!email || !EMAIL_RE.test(String(email).trim())) errors.push('Email is not valid');
    if (!phone || !/^\d{10}$/.test(String(phone).trim())) errors.push('Phone must be exactly 10 digits');
    if (!city || !CITIES.includes(city)) errors.push('City must be one of: ' + CITIES.join(', '));
    if (!password || password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password))
      errors.push('Password must be at least 8 characters with one uppercase letter and one number');

    if (errors.length) return sendError(res, 400, errors[0]);

    const normalizedEmail = String(email).trim().toLowerCase();

    const dupe = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (dupe.rows.length > 0) return sendError(res, 409, 'An account with this email already exists');

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, phone, city, password_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, city`,
      [name.trim(), normalizedEmail, phone.trim(), city, hash]);
    const user = rows[0];

    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    console.error('POST /api/auth/register failed:', err.message);
    sendError(res, 500, 'Internal server error');
  }
};
