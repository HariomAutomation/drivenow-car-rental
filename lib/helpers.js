/* Shared helpers for all API functions */
function getBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

function sendError(res, status, message) {
  res.status(status).json({ error: message });
}

module.exports = { getBody, sendError };
