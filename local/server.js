/* Local dev harness: serves the static frontend + Vercel-style API functions
 * with plain Node (no Vercel CLI needed). For local development/testing only.
 * Usage: node local/server.js   (requires DATABASE_URL to be set)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = path.join(__dirname, '..');

// Some sandboxes throw a harmless wasm-related unhandled rejection from pg's
// optional undici path — keep the process alive when it happens.
process.on('unhandledRejection', (e) => {
  console.warn('[warn] ignored unhandled rejection:', e && e.message);
});
const routes = {
  '/api/cars': () => require('../api/cars'),
  '/api/auth/register': () => require('../api/auth/register'),
  '/api/auth/login': () => require('../api/auth/login'),
  '/api/bookings': () => require('../api/bookings'),
  '/api/bookings/quote': () => require('../api/bookings/quote'),
  '/api/contact': () => require('../api/contact')
};

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;

  let handler = null;
  const params = {};
  if (routes[p]) {
    handler = routes[p]();
  } else {
    let m = p.match(/^\/api\/cars\/([^/]+)$/);
    if (m) { handler = require('../api/cars/[id]'); params.id = decodeURIComponent(m[1]); }
    else {
      m = p.match(/^\/api\/bookings\/([^/]+)\/cancel$/);
      if (m) { handler = require('../api/bookings/[ref]/cancel'); params.ref = decodeURIComponent(m[1]); }
    }
  }

  if (handler) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString('utf8');
    try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
    req.query = { ...params, ...Object.fromEntries(u.searchParams) };

    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (obj) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); return res; };
    return handler(req, res);
  }

  // Static files
  const safe = path.normalize(p === '/' ? '/index.html' : p).replace(/^(\.\.[\/\\])+/, '');
  const full = path.join(ROOT, safe);
  if (!full.startsWith(ROOT)) { res.statusCode = 403; return res.end('Forbidden'); }
  fs.readFile(full, (err, data) => {
    if (err) { res.statusCode = 404; return res.end('Not found'); }
    const types = {
      '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
      '.json': 'application/json', '.sql': 'text/plain', '.md': 'text/plain'
    };
    res.setHeader('Content-Type', types[path.extname(full)] || 'application/octet-stream');
    res.end(data);
  });
});

const PORT = process.env.DRIVENOW_PORT || process.argv[2] || 3000;
server.listen(PORT, () => console.log(`DriveNow running on http://localhost:${PORT}`));
