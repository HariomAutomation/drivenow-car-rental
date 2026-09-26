/* POST /api/contact — save a support message. No auth needed.
 * Body: { name, email, message }
 * 201 { ok: true } | 400 validation
 */
const pool = require('../lib/db');
const { getBody, sendError } = require('../lib/helpers');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

module.exports = async (req, res) => {
  try {
    const { name, email, message } = getBody(req);

    if (!name || name.trim().length < 3) return sendError(res, 400, 'Name must be at least 3 characters');
    if (!email || !EMAIL_RE.test(String(email).trim())) return sendError(res, 400, 'Email is not valid');
    if (!message || message.trim().length < 10) return sendError(res, 400, 'Message must be at least 10 characters');

    await pool.query(
      'INSERT INTO messages (name, email, message) VALUES ($1, $2, $3)',
      [name.trim(), email.trim(), message.trim()]);

    res.status(201).json({ ok: true, message: 'Message received. Our team will reply within 24 hours.' });
  } catch (err) {
    console.error('POST /api/contact failed:', err.message);
    sendError(res, 500, 'Internal server error');
  }
};
