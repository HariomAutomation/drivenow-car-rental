-- DriveNow Car Rentals - database schema + fleet seed
-- Run this once in the Supabase SQL Editor (or any Postgres client).

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  phone         VARCHAR(10)  NOT NULL,
  city          VARCHAR(20)  NOT NULL,
  password_hash TEXT         NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cars (
  id           VARCHAR(20) PRIMARY KEY,
  brand        VARCHAR(50)  NOT NULL,
  model        VARCHAR(50)  NOT NULL,
  type         VARCHAR(20)  NOT NULL,
  seats        INT          NOT NULL,
  fuel         VARCHAR(20)  NOT NULL,
  transmission VARCHAR(20)  NOT NULL,
  price_per_day INT         NOT NULL,
  cities       TEXT[]       NOT NULL,
  color        VARCHAR(7)   NOT NULL DEFAULT '#1e5eff',
  rating       NUMERIC(2,1) NOT NULL,
  trips        INT          NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  booking_ref  VARCHAR(20) PRIMARY KEY,
  user_id      INT          NOT NULL REFERENCES users(id),
  car_id       VARCHAR(20)  NOT NULL REFERENCES cars(id),
  city         VARCHAR(20)  NOT NULL,
  from_date    DATE         NOT NULL,
  to_date      DATE         NOT NULL,
  days         INT          NOT NULL,
  extras       TEXT[]        NOT NULL DEFAULT '{}',
  coupon       VARCHAR(20)  NOT NULL DEFAULT '',
  base         INT          NOT NULL,
  extras_total INT          NOT NULL,
  discount     INT          NOT NULL,
  gst          INT          NOT NULL,
  total        INT          NOT NULL,
  status       VARCHAR(20)  NOT NULL DEFAULT 'CONFIRMED',
  booked_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  message    TEXT         NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_car_status_dates ON bookings (car_id, status, from_date, to_date);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings (user_id, booked_at DESC);

INSERT INTO cars (id, brand, model, type, seats, fuel, transmission, price_per_day, cities, color, rating, trips) VALUES
  ('CAR-101', 'Maruti Suzuki', 'Swift',        'Hatchback', 5, 'Petrol', 'Manual',    1800, ARRAY['delhi','jaipur'],            '#e74c3c', 4.5, 312),
  ('CAR-102', 'Hyundai',        'i20',          'Hatchback', 5, 'Petrol', 'Manual',    2100, ARRAY['delhi','mumbai'],           '#3498db', 4.3, 268),
  ('CAR-103', 'Tata',           'Tiago',        'Hatchback', 4, 'CNG',    'Manual',    1500, ARRAY['jaipur','pune'],           '#2ecc71', 4.1, 190),
  ('CAR-104', 'Maruti Suzuki',  'Baleno',       'Hatchback', 5, 'Petrol', 'AMT',       1950, ARRAY['delhi','pune'],           '#9b59b6', 4.4, 245),
  ('CAR-105', 'Honda',          'City',         'Sedan',     5, 'Petrol', 'CVT',       2500, ARRAY['delhi','bangalore'],       '#34495e', 4.6, 421),
  ('CAR-106', 'Hyundai',        'Verna',        'Sedan',     5, 'Petrol', 'Automatic', 2800, ARRAY['mumbai'],                  '#e67e22', 4.4, 301),
  ('CAR-107', 'Skoda',          'Octavia',      'Sedan',     5, 'Petrol', 'DCT',       3900, ARRAY['bangalore'],               '#1abc9c', 4.7, 154),
  ('CAR-108', 'Maruti Suzuki',  'Dzire',        'Sedan',     5, 'Petrol', 'AMT',       2000, ARRAY['delhi','jaipur','pune'],  '#95a5a6', 4.2, 389),
  ('CAR-109', 'Tata',           'Nexon',        'SUV',       5, 'Diesel', 'Manual',    2800, ARRAY['delhi','bangalore'],       '#2980b9', 4.6, 356),
  ('CAR-110', 'Mahindra',       'Thar',         'SUV',       4, 'Diesel', 'Automatic', 3200, ARRAY['jaipur'],                  '#c0392b', 4.8, 275),
  ('CAR-111', 'Toyota',         'Fortuner',     'SUV',       7, 'Diesel', 'Automatic', 5500, ARRAY['delhi','mumbai'],         '#16a085', 4.9, 488),
  ('CAR-112', 'Hyundai',        'Creta',        'SUV',       5, 'Petrol', 'Automatic', 3300, ARRAY['bangalore','pune'],      '#d35400', 4.7, 402),
  ('CAR-113', 'Mahindra',       'XUV700',       'SUV',       7, 'Diesel', 'Automatic', 4200, ARRAY['mumbai','bangalore'],    '#2c3e50', 4.8, 198),
  ('CAR-114', 'Toyota',         'Innova Crysta', 'MPV',       7, 'Diesel', 'Manual',    3600, ARRAY['mumbai','pune','delhi'],  '#7f8c8d', 4.8, 517),
  ('CAR-115', 'BMW',            '3 Series',     'Luxury',    5, 'Petrol', 'Automatic', 9500, ARRAY['delhi'],                  '#27ae60', 4.9, 96),
  ('CAR-116', 'Audi',           'A4',           'Luxury',    5, 'Petrol', 'Automatic', 8900, ARRAY['bangalore'],               '#f1c40f', 4.7, 81)
ON CONFLICT (id) DO NOTHING;
