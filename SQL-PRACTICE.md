# SQL Practice Guide - DriveNow Database

Yeh guide tumhare apne DriveNow app ke real database par SQL seekhne ke liye hai.
Database me 4 tables hain: `cars`, `users`, `bookings`, `messages`.

## Shell kaise kholo

```bash
npm run sql
```

Ya seedha: `node local/sql.js`

Ek psql-jaisa prompt khulega:

```
drivenow=#
```

Helper commands:
- `\dt` - saari tables list karo
- `\d cars` - cars table ke columns aur types dekho
- `\?` - help
- `\q` - quit

Har SQL statement `;` (semicolon) se end hota hai. Enter dabao, result table me print hoga.

Ek query one-shot chalane ke liye:

```bash
node local/sql.js "SELECT COUNT(*) FROM cars;"
```

---

## Level 1: SELECT basics (Day 1)

```sql
-- sabhi cars dekho
SELECT * FROM cars;

-- sirf chuni hui columns
SELECT brand, model, price_per_day FROM cars;

-- rows limit karna
SELECT * FROM cars LIMIT 5;
```

**Practice:**
1. Sirf `brand`, `model`, `seats` columns print karo.
2. Cars ko price ke descending order me dikhao (`ORDER BY price_per_day DESC`).
3. Pehli 3 rows print karo (`LIMIT 3`).

## Level 2: WHERE - filtering (Day 2)

```sql
-- mehngi cars
SELECT brand, model FROM cars WHERE price_per_day > 4000;

-- ek sheher ki cars (cities ek array hai, isliye ANY use karo)
SELECT brand, model FROM cars WHERE 'mumbai' = ANY(cities);

-- multiple conditions
SELECT * FROM cars WHERE seats = 5 AND fuel = 'petrol';

-- pattern matching: Maruti ya Mahindra
SELECT brand, model FROM cars WHERE brand LIKE 'M%';

-- range
SELECT brand, model FROM cars WHERE price_per_day BETWEEN 1500 AND 3000;
```

**Practice:**
1. `delhi` me available 7-seater cars dhoondo.
2. Rating 4.5 se zyada wali automatic (transmission = 'automatic') cars list karo.
3. `type = 'suv'` aur price 3000 se kam wali cars.

## Level 3: Aggregates + GROUP BY (Day 3)

```sql
-- total kitni cars hain
SELECT COUNT(*) FROM cars;

-- average, min, max price
SELECT AVG(price_per_day) AS avg_price,
       MIN(price_per_day) AS cheapest,
       MAX(price_per_day) AS costliest
FROM cars;

-- har sheher me kitni cars hain (array column ko unnest karke)
SELECT city, COUNT(*) AS total_cars
FROM cars, unnest(cities) AS city
GROUP BY city
ORDER BY total_cars DESC;

-- har brand ki average rating
SELECT brand, AVG(rating) AS avg_rating, COUNT(*) AS models
FROM cars
GROUP BY brand
ORDER BY avg_rating DESC;
```

**Practice:**
1. Har `type` (suv, sedan, hatchback...) me kitni cars hain?
2. Sabse zyada trips wali 5 cars dhoondo (`ORDER BY trips DESC LIMIT 5`).
3. Har fuel type ki average price nikalo.

## Level 4: INSERT / UPDATE / DELETE (Day 4)

Pehle ek user register karo website par (http://localhost:3000), phir:

```sql
-- dekho tumhara user DB me gaya
SELECT id, name, email, city, created_at FROM users;

-- phone update karo
UPDATE users SET phone = '9999999999' WHERE email = 'tumhara@email.com';

-- ek nahi chahiye wala user delete (pehle uski bookings delete karni padengi)
DELETE FROM bookings WHERE user_id = 2;
DELETE FROM users WHERE id = 2;
```

**Practice:**
1. Website se 2-3 bookings karo (different cars, cities).
2. Har booking ka `booking_ref`, `total` aur `status` SELECT karo.
3. Ek booking ko `UPDATE bookings SET status = 'CANCELLED' WHERE booking_ref = '...'` se cancel karo - aur website ke My Bookings page par verify karo ki change dikh raha hai. **Yehi asli QA DB-validation hai!**

## Level 5: JOINs (Day 5)

```sql
-- bookings + users + cars ek saath (business report jaisa)
SELECT b.booking_ref,
       u.name,
       c.brand || ' ' || c.model AS car,
       b.city,
       b.days,
       b.total
FROM bookings b
JOIN users u ON u.id = b.user_id
JOIN cars c ON c.id = b.car_id
ORDER BY b.total DESC;

-- LEFT JOIN: jin users ne kabhi booking nahi ki
SELECT u.id, u.name, u.city
FROM users u
LEFT JOIN bookings b ON b.user_id = u.id
WHERE b.booking_ref IS NULL;
```

**Practice:**
1. Har sheher ka total revenue: `SUM(b.total)` GROUP BY b.city.
2. Sabse zyada revenue wali car top 5.
3. Jin cars ki koi booking nahi hui (LEFT JOIN cars se).

## Level 6: QA ke liye DB Validation queries (Day 6+)

Yeh tumhare interview aur portfolio me sabse zyada kaam aayenge - API call ke baad DB me verify karna:

```sql
-- Test: register API ne user theek se save kiya?
SELECT name, email, phone, city FROM users WHERE email = 'test@example.com';

-- Test: booking ka fare math sahi hai?
-- total = base + extras_total - discount + gst
SELECT booking_ref,
       base,
       extras_total,
       discount,
       gst,
       total,
       (base + extras_total - discount + gst) AS expected_total
FROM bookings
WHERE booking_ref = 'BR-XXXXXX';

-- Test: cancel ke baad status badla?
SELECT booking_ref, status FROM bookings WHERE booking_ref = 'BR-XXXXXX';

-- Test: duplicate email allowed nahi (yeh constraint DB me hai)
-- users.email par UNIQUE constraint hai - isliye duplicate INSERT fail hota hai
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_name = 'users';

-- Data integrity: koi booking aisi car par hai jo us city me available nahi?
SELECT b.booking_ref, b.city
FROM bookings b
JOIN cars c ON c.id = b.car_id
WHERE NOT (b.city = ANY(c.cities));

-- Booking dates valid hain? (to_date hamesha from_date ke baad)
SELECT * FROM bookings WHERE to_date <= from_date;
```

Aakhri do queries ka result **khali hona chahiye** - agar koi row aayi to bug hai!

## Bonus: Interview me poochhe jane wale concepts isi DB par

```sql
-- Transactions (bank transfer jaisa: sab kuch ya kuch nahi)
BEGIN;
UPDATE users SET city = 'jaipur' WHERE id = 1;
ROLLBACK;   -- ya COMMIT; -- ROLLBACK se change wapas ho jata hai

-- Index dekho
SELECT indexname FROM pg_indexes WHERE tablename = 'bookings';

-- NULL handling
SELECT COUNT(*) FROM bookings WHERE coupon IS NOT NULL AND coupon != '';

-- CASE expression
SELECT booking_ref,
       CASE WHEN total > 20000 THEN 'PREMIUM'
            WHEN total > 10000 THEN 'MID'
            ELSE 'BUDGET' END AS segment
FROM bookings;
```

## GUI tool chahiye to

Terminal pasand nahi aaye to **DBeaver** (free, dbeaver.io) ya **pgAdmin** install karo aur in details se connect karo:

- Host: `localhost`
- Port: `5433`
- Database: `drivenow`
- User: `postgres`
- Password: (blank - trust auth hai)

Note: database tab chalta hai jab `npm run dev` ya `npm run sql` chalu ho.

---

## Suggested 7-day plan

| Day | Topic | Kya karna hai |
|-----|-------|---------------|
| 1 | SELECT, LIMIT, ORDER BY | Level 1 exercises |
| 2 | WHERE, LIKE, BETWEEN | Level 2 exercises |
| 3 | COUNT, AVG, GROUP BY | Level 3 exercises |
| 4 | INSERT, UPDATE, DELETE | Website + SQL dono me karo, compare karo |
| 5 | JOINs | Level 5 exercises |
| 6 | DB validation for QA | Level 6 queries apni bookings par chalao |
| 7 | Transactions, CASE, indexes | Bonus section |

Har level ke baad khud se 2 naye queries banane ki koshish karo - yahi asli practice hai.
