/* POST /api/auth/login
 * Body: { email, password }
 * 200 { token, user } | 400 validation | 401 invalid credentials
 */
const bcrypt = require('bcryptjs');
const pool = require('../../lib/db');
const { signToken } = require('../../lib/auth');
const { getBody, sendError } = require('../../lib/helpers');

module.exports = async (req, res) => {
  try {
    const { email, password } = getBody(req);

    if (!email || !password) return sendError(res, 400, 'Email and password are required');

    const { rows } = await pool.query(
      'SELECT id, name, email, phone, city, password_hash FROM users WHERE email = $1',
      [String(email).trim().toLowerCase()]);

    const user = rows[0];
    const hashOk = user ? await bcrypt.compare(password, user.password_hash) : false;

    if (!user || !hashOk) return sendError(res, 401, 'Invalid email or password');

    const safeUser = { id: user.id, name: user.name, email: user.email, phone: user.phone, city: user.city };
    res.status(200).json({ token: signToken(safeUser), user: safeUser });
  } catch (err) {
    console.error('POST /api/auth/login failed:', err.message);
    sendError(res, 500, 'Internal server error');
  }
};
