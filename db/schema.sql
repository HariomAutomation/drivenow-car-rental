-- DriveNow Car Rentals Б─■ database schema + fleet seed
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
  email       U░T░рT┼█MJH⌠у∙S┬Y\эьYыHV⌠у∙S┬э≥X]Yь]SQTуST┬⌠у∙SQ░US⌠уй
B┼Nб┌░т▒PUHS▒VQ┬⌠уVTухYь⌡шзз[≥эвьь\≈эщ]\вы]\хс┬⌡шзз[≥эх
ь\≈зYщ]\к°⌡шWы]Kвы]JNб░т▒PUHS▒VQ┬⌠уVTухYь⌡шзз[≥эвщ\ы\┬с┬⌡шзз[≥эх
\ы\≈зY⌡шзыYь]TпйNб┌▓S■яT∙S∙хь\°х
Y°≤[≥[ы[\KыX]к²Y[≤[°шZ\эз[ш▀ XыWэ\≈ы^Kз]Y\кшшэ▀≤][≥к \йH░SQTб┬
	ппT▀LLIк	сX\²]Hщ^²ZзIк	тщзY²	к	р]з≤XзикK	т]⌡ш	к	сX[²X[	кNT■░VVиы[Iк	з≤Z\\┴вK	хыMмльик█KлL┼K┬
	ппT▀LL┴к	р][≥ZIк	зL▄	к	р]з≤XзикK	т]⌡ш	к	сX[²X[	к▄LT■░VVиы[Iк	ш][X≤ZIвK	хлмN┴к▄к█▌
K┬
	ппT▀LLик	у]Iк	уXYшик	р]з≤Xзик	пс▒ик	сX[²X[	кMLT■░VVиз≤Z\\┴к	э[≥IвK	хл≥XьмлIк▄KNL
K┬
	ппT▀LL	к	сX\²]Hщ^ ZзIк	п≤[[⌡ик	р]з≤XзикK	т]⌡ш	к	пSUикNMLT■░VVиы[Iк	э[≥IвK	хнX█NX█┴к██JK┬
	ппT▀LLIк	рш≥Iк	пз]Iк	тыY[┴кK	т]⌡ш	к	пу∙	к█LT■░VVиы[Iк	ь≤[≥ь[э≥IвK	хлмMYIк█▀▄JK┬
	ппT▀LL┴к	р][≥ZIк	у≥\⌡≤Iк	тыY[┴кK	т]⌡ш	к	п]]шX]Xик▌T■░VVиш][X≤ZIвK	хыM█ыL▄┴к█лJK┬
	ппT▀LLик	тзшыIк	сьщ] XIк	тыY[┴кK	т]⌡ш	к	яу	кнLT■░VVиь≤[≥ь[э≥IвK	хлXX≤нXик█кMM
K┬
	ппT▀LL	к	сX\²]Hщ^ ZзIк	я \≥Iк	тыY[┴кK	т]⌡ш	к	пSUiк▄T■░VVиы[Iк	з≤Z\\┴к	э[≥IвK	хнMXMXM┴к▄▀нJK┬
	ппT▀LLIк	у]Iк	с≥^ш┴к	туU┴кK	яY\ы[	к	сX[²X[	к▌T■░VVиы[Iк	ь≤[≥ь[э≥IвK	хл▌N▌Iк█▀мM┼K┬
	ппT▀LLL	к	сXZ[≥≤Iк	у\┴к	туU┴к	яY\ы[	к	п]]шX]Xикл▄T■░VVиз≤Z\\┴вK	хьлнL≤┴к▌█мJK┬
	ппT▀LLLIк	уч[щIк	я⌡э²[≥\┴к	туU┴кк	яY\ы[	к	п]]шX]XикMLT■░VVиы[Iк	ш][X≤ZIвK	хлM≤LIк▌K
K┬
	ппT▀LLL┴к	р][≥ZIк	пэ≥]Iк	туU┴кK	т]⌡ш	к	п]]шX]XикллT■░VVиь≤[≥ь[э≥Iк	э[≥IвK	хымM	к█к┼K┬
	ппT▀LLLик	сXZ[≥≤Iк	жU█л	к	туU┴кк	яY\ы[	к	п]]шX]Xик▄T■░VVиш][X≤ZIк	ь≤[≥ь[э≥IвK	хл≤лыML	к▌NN
K┬
	ппT▀LLM	к	уч[щIк	р[⌡⌡щ≤Hэ·\щIк	сT┴кк	яY\ы[	к	сX[²X[	км▄T■░VVиш][X≤ZIк	э[≥Iк	ы[IвK	хмы▌н	к▌LMйK┬
	ппT▀LLMIк	п⌠Uик	лхы\ Y\ик	с^\·IкK	т]⌡ш	к	п]]шX]XикMLT■░VVиы[IвK	хл█ьYM▄	к▌KM┼K┬
	ппT▀LLM┴к	п]YIк	пIк	с^\·IкK	т]⌡ш	к	п]]шX]XикLT■░VVиь≤[≥ь[э≥IвK	хы▄Xм┴к█кJB⌠с┬сс▒⌠Pу
Y
Hх⌠уS▒нб