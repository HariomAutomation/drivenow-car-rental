/* DriveNow — shared frontend core: API client, auth store, helpers */

const TOKEN_KEY = 'drivenow_token';
const USER_KEY = 'drivenow_user';

/* ---------- Auth store ---------- */
function setAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
function getAuth() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  try { return { token, user: JSON.parse(localStorage.getItem(USER_KEY)) }; }
  catch { return null; }
}
function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
function logout() {
  clearAuth();
  location.href = 'index.html';
}

/* ---------- API client ---------- */
/*
 * Calls the backend at /api/<path>.
 * - Adds Authorization: Bearer <token> when logged in
 * - Parses JSON responses
 * - On 401 (session expired) for protected pages: clears auth and redirects to login
 * - Throws Error with .status and .data on non-2xx responses
 */
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const auth = getAuth();
  if (auth) headers['Authorization'] = 'Bearer ' + auth.token;

  const response = await fetch('/api' + path, { ...opts, headers });
  let data = null;
  try { data = await response.json(); } catch { /* no body */ }

  if (response.status === 401 && !path.startsWith('/auth/')) {
    clearAuth();
    const here = location.pathname.split('/').pop() + location.search;
    location.href = 'login.html?redirect=' + encodeURIComponent(here);
    throw Object.assign(new Error('Session expired'), { status: 401, data });
  }

  if (!response.ok) {
    throw Object.assign(new Error((data && data.error) || 'Request failed'), {
      status: response.status,
      data
    });
  }
  return data;
}

/* ---------- Query params ---------- */
function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

/* ---------- Formatting & misc helpers ---------- */
function formatINR(n) {
  return '₹ ' + Math.round(n).toLocaleString('en-IN');
}
function cityName(id) {
  const c = CITIES.find(c => c.id === id);
  return c ? c.name : id;
}
function todayISO() {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function daysBetween(fromISO, toISO) {
  const a = new Date(fromISO + 'T00:00:00');
  const b = new Date(toISO + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ---------- Luhn check (demo payment card) ---------- */
function luhnValid(cardNumber) {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length === 0) return false;
  let sum = 0, dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

/* ---------- Field validation helpers ---------- */
function setFieldError(inputId, message) {
  const field = document.getElementById(inputId)?.closest('.field');
  if (!field) return;
  const err = field.querySelector('.error');
  if (message) {
    if (err) err.textContent = message;
    field.classList.add('invalid');
  } else {
    field.classList.remove('invalid');
  }
}
function clearFieldErrors() {
  document.querySelectorAll('.field.invalid').forEach(f => f.classList.remove('invalid'));
}

/* ---------- Navigation & footer ---------- */
function renderNav(active) {
  const auth = getAuth();
  const links = [
    { href: 'index.html', label: 'Home', key: 'home' },
    { href: 'cars.html', label: 'Find a Car', key: 'cars' },
    { href: 'about.html', label: 'About', key: 'about' },
    { href: 'contact.html', label: 'Contact', key: 'contact' }
  ].map(l => `<a class="nav-link ${l.key === active ? 'active' : ''}" href="${l.href}">${l.label}</a>`).join('');

  let right;
  if (auth) {
    right = `
      <a class="nav-link ${active === 'mybookings' ? 'active' : ''}" href="mybookings.html">My Bookings</a>
      <span class="nav-user">Hi, <b>${auth.user.name}</b></span>
      <a class="btn btn-sm" href="#" onclick="logout(); return false;" data-testid="nav-logout">Logout</a>`;
  } else {
    right = `
      <a class="nav-link ${active === 'login' ? 'active' : ''}" href="login.html">Login</a>
      <a class="btn btn-sm" href="register.html" data-testid="nav-register">Sign Up</a>`;
  }

  document.body.insertAdjacentHTML('afterbegin', `
    <nav class="nav">
      <a class="brand" href="index.html"><span class="logo-badge">DN</span> DriveNow</a>
      ${links}
      <div class="nav-right">${right}</div>
    </nav>`);
}

function renderFooter() {
  document.body.insertAdjacentHTML('beforeend', `
    <footer class="site-footer">
      <div class="footer-inner">
        <div>
          <b style="color:#fff">DriveNow Car Rentals</b><br>
          Self-drive car rentals across 5 cities in India.<br>
          This is a demo product used for QA practice.
        </div>
        <div>
          <b style="color:#fff">Quick Links</b><br>
          <a href="cars.html">Find a Car</a><br>
          <a href="mybookings.html">My Bookings</a><br>
          <a href="contact.html">Support</a>
        </div>
        <div>
          <b style="color:#fff">Developers</b><br>
          <a href="api.html">REST API Docs</a><br>
          <a href="api.html">/api endpoints</a>
        </div>
      </div>
    </footer>`);
}
