/* JWT helpers */
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'drivenow-demo-secret-change-me';
const TOKEN_EXPIRY = '24h';

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, SECRET, { expiresIn: TOKEN_EXPIRY });
}

/* Returns the decoded token payload, or null if missing/invalid/expired. */
function verifyAuth(req) {
  const header = req.headers['authorization'] || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    return jwt.verify(match[1], SECRET);
  } catch {
    return null;
  }
}

module.exports = { signToken, verifyAuth, SECRET, TOKEN_EXPIRY };
