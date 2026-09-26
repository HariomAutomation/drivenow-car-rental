# DriveNow Car Rentals - Full-Stack

A realistic self-drive car-rental application built as a **QA portfolio target**: a real frontend + real REST API + real database, deployed on Vercel - so you can practise **UI E2E, API automation, SQL data validation, security and performance testing** against it like a real project.

## Architecture

```
+--------------------+        +--------------------------+        +--------------+
|  Static frontend   |  fetch |  Vercel serverless API   |   pg   |  Supabase    |
|  (HTML/CSS/JS)     | -----> |  /api/*.js (Node 18+)    | -----> |  PostgreSQL  |
|  localStorage JWT  |        |  JWT auth, fare engine   |        |  users/cars/ |
+--------------------+        +--------------------------+        |  bookings    |
                                                                  +--------------+
```

- **Frontend**: static pages (no framework, no build step)
- **Backend**: Vercel serverless functions (`/api/*`), JWT auth (`jsonwebtoken`), bcrypt password hashing
- **Database**: PostgreSQL (Supabase free tier) - `users`, `cars`, `bookings`, `messages` tables (`db/schema.sql`)
- All business rules (fare, overlap, cancellation) are enforced **server-side** - the frontend is just a client

---

## Deploy - 3 steps

### 1. Create the database (Supabase, free)
1. Go to https://supabase.com -> **New project** (any name, e.g. `drivenow`).
2. Open **SQL Editor** -> paste the contents of `db/schema.sql` -> **Run**. Tables + 16-car fleet are created.
3. Go to **Project Settings -> Database -> Connection string -> URI** and copy it. Replace `[YOUR-PASSWORD]` with your DB password. This is your `DATABASE_URL`.
   > Tip: prefer the **Connection pooling** URI (port `6543`) - it's made for serverless.

### 2. Push this code to GitHub
```bash
git init
git add .
git commit -m "DriveNow full-stack app"
git branch -M main
git remote add origin https://github.com/<your-username>/drivenow.git
git push -u origin main
```

### 3. Deploy on Vercel
1. https://vercel.com -> **Continue with GitHub** -> **Add New -> Project** -> import the `drivenow` repo.
2. Framework preset: **Other** (no build settings needed).
3. **Environment Variables** - add:
   - `DATABASE_URL` = the Supabase URI from step 1
   - `JWT_SECRET` = any long random string (e.g. run `openssl rand -hex 32`)
4. **Deploy** -> live at `https://drivenow-<you>.vercel.app`

Every `git push` to `main` redeploys automatically - perfect for CI/CD practice.

### Run locally (one command - real embedded Postgres, no install)
```bash
npm install
npm run dev          # starts Postgres + schema + app at http://localhost:3000
```
This uses `local/dev.js` (a bundled embedded PostgreSQL) plus `local/server.js`
(a Node harness that serves the frontend and the same `/api` functions Vercel runs).

### Practice SQL against the local database
```bash
npm run sql
```
Opens an interactive SQL shell (`local/sql.js`) on the same embedded PostgreSQL
(database `drivenow`, port 5433). Type SQL ending with `;`, or use psql-style
commands: `\dt` (tables), `\d cars` (describe), `\q` (quit). A guided learning
path with QA-focused DB-validation queries is in [SQL-PRACTICE.md](SQL-PRACTICE.md).
GUI alternative: connect DBeaver/pgAdmin to localhost:5433, db `drivenow`, user
`postgres`, no password.

### Run locally (against Supabase, via Vercel CLI)
```bash
npm install -g vercel
vercel dev
```

---

## REST API reference

Base URL: `https://<your-app>.vercel.app/api` | All bodies and responses are JSON.
Errors are always `{"error": "message"}` with the proper status code.

### `GET /api/cars` - list the fleet (public)
Query params: `city` (delhi|mumbai|bangalore|pune|jaipur) | `type` (Hatchback|Sedan|SUV|MPV|Luxury) | `seats` (min, e.g. `5`) | `sort` (`rating`|`price-asc`|`price-desc`, default `rating`) | `from`,`to` (ISO dates - hides cars with a CONFIRMED booking overlapping that range)
-> `200 { "total": 16, "cars": [ { "id": "CAR-101", "brand": "Maruti Suzuki", "model": "Swift", "type": "Hatchback", "seats": 5, "fuel": "Petrol", "transmission": "Manual", "pricePerDay": 1800, "cities": ["delhi","jaipur"], "color": "#e74c3c", "rating": 4.5, "trips": 312 }, ... ] }`

### `GET /api/cars/:id` - single car (public)
-> `200 { car }` | `404` unknown id

### `POST /api/auth/register` (public)
```json
{ "name": "Hariom Prajapati", "email": "you@example.com", "phone": "9876543210", "city": "delhi", "password": "Test@1234" }
```
-> `201 { "token": "eyJ...", "user": {...} }` | `400` invalid field (first failing rule in `error`) | `409` email already exists

Validation: name >= 3 chars | email format | phone exactly 10 digits | city in the 5 listed | password >= 8 chars with 1 uppercase + 1 number

### `POST /api/auth/login` (public)
```json
{ "email": "you@example.com", "password": "Test@1234" }
```
-> `200 { "token": "eyJ...", "user": {...} }` | `400` missing fields | `401` invalid credentials (generic message, no hint which field is wrong)

Token: JWT, expires in **24h**. Send as `Authorization: Bearer <token>`.

### `POST /api/bookings/quote` (public - no side effects)
```json
{ "carId": "CAR-111", "fromDate": "2026-10-05", "toDate": "2026-10-08", "extras": ["gps","insurance"], "coupon": "DRIVE10" }
```
-> `200 { "days": 3, "base": 16500, "extrasTotal": 749, "extrasDetail": [...], "discount": 500, "gst": 3002, "total": 19751, "couponApplied": true, "carAvailable": true }`
-> `400` invalid dates/carId | `404` unknown car

### `GET /api/bookings` (auth)
-> `200 { "total": n, "bookings": [ { "bookingRef": "DT-XXXXXX", "carId": "CAR-111", "carName": "Toyota Fortuner", "city": "delhi", "fromDate": "...", "toDate": "...", "days": 3, "extras": ["gps"], "coupon": "DRIVE10", "base": 16500, "extrasTotal": 749, "discount": 500, "gst": 3002, "total": 19751, "status": "CONFIRMED", "bookedAt": "..." } ] }` | `401` no/invalid token

### `POST /api/bookings` (auth)
```json
{ "carId": "CAR-111", "city": "delhi", "fromDate": "2026-10-05", "toDate": "2026-10-08", "extras": ["gps"], "coupon": "DRIVE10" }
```
-> `201 { "booking": {...} }` (includes server-computed `total`)
-> `400` validation (past date, >30 days, city not offered, invalid coupon...) | `401` | `404` car | `409` **car already booked for overlapping dates**

### `PATCH /api/bookings/:ref/cancel` (auth)
-> `200 { "booking": {..., "status": "CANCELLED" } }`
-> `400` already cancelled / pickup date arrived | `401` | `404` not found or not your booking

### `POST /api/contact` (public)
`{ "name", "email", "message" }` -> `201 { "ok": true }` | `400` validation (name >= 3, email format, message >= 10 chars)

---

## Business rules (your test oracle)

- **Fare**: `base = pricePerDay x days` | `extras` = GPS Rs.150/day + child seat Rs.100/day + insurance Rs.299 flat | `discount` = 10% of base with coupon `DRIVE10`, **capped at Rs.500** | `gst` = 18% of (base - discount + extras) | `total = base - discount + extras + gst`
- **Rental duration**: 1-30 days; pickup date cannot be in the past; return strictly after pickup
- **Overlapping bookings**: one CONFIRMED booking per car per date range; a second overlapping booking -> `409`. Cancelling frees the dates again.
- **Cancellation**: only own bookings, only `CONFIRMED`, only before the pickup date
- **Coupon**: `DRIVE10` (case-insensitive); invalid coupon rejected with `400` on booking creation

## QA workflow for your portfolio

1. **Test plan + cases** from this README (equivalence/boundary: days 1/30/31, password 7/8 chars, coupon just over the Rs.500 cap, card 15/16 digits...)
2. **API automation**: Playwright `APIRequestContext` or Postman - register -> login -> quote -> book -> re-book (expect 409) -> cancel -> verify freed
3. **UI E2E**: Playwright + TypeScript with Page Object Model; `data-testid` hooks are on every interactive element
4. **DB validation**: connect to Supabase Postgres (SQL editor or `psql`) and verify booking rows match API responses - `SELECT * FROM bookings WHERE booking_ref = 'DT-...'`
5. **Security checks**: 401 without token, tampered token, expired token, other user's booking ref (expect 404), SQL-injection attempts in query params
6. **CI/CD**: GitHub Actions running the suite on every push; Vercel redeploys on green

**Test data cheats**: coupon `DRIVE10` | Luhn-valid card `4111111111111111` (any future expiry, any 3-digit CVV) | cars `CAR-101`...`CAR-116`

---

*Demo product for QA practice - no real payments. JWT secret default is insecure on purpose if unset; always set `JWT_SECRET` in production.*
