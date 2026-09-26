/* Booking wizard — quotes and bookings come from the real API */
document.addEventListener('DOMContentLoaded', async () => {
  renderNav('cars');
  renderFooter();

  // --- Auth guard ---
  if (!getAuth()) {
    location.href = 'login.html?redirect=' + encodeURIComponent(location.pathname.split('/').pop() + location.search);
    return;
  }

  const carId = getParam('carId');
  const pageErr = document.getElementById('booking-page-error');

  let car;
  try {
    car = await api('/cars/' + encodeURIComponent(carId || ''));
  } catch (err) {
    document.querySelector('.container-narrow').innerHTML = `
      <div class="empty-state card">
        <div style="font-size:40px">🚫</div>
        <h1 class="page-title">Car not found</h1>
        <p class="page-sub">The booking link is invalid.</p>
        <a class="btn" href="cars.html">Browse all cars</a>
      </div>`;
    return;
  }

  document.getElementById('booking-car-line').textContent =
    `Booking the ${car.brand} ${car.model} (${car.type}) at ${formatINR(car.pricePerDay)}/day, unlimited kilometres.`;

  const steps = document.querySelectorAll('.wizard-step');
  const panels = { 1: document.getElementById('step-1'), 2: document.getElementById('step-2'), 3: document.getElementById('step-3') };
  const confirmPanel = document.getElementById('step-confirm');
  const citySel = document.getElementById('b-city');
  const fromIn = document.getElementById('b-from');
  const toIn = document.getElementById('b-to');
  const daysLine = document.getElementById('rental-days-line');
  const today = todayISO();
  fromIn.min = today;
  toIn.min = today;

  CITIES.filter(c => car.cities.includes(c.id)).forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id; opt.textContent = c.name;
    citySel.appendChild(opt);
  });

  const showPageError = (msg) => { pageErr.textContent = msg; pageErr.classList.add('show'); };
  const hidePageError = () => pageErr.classList.remove('show');

  function goTo(n) {
    steps.forEach(s => {
      s.classList.remove('active');
      const sn = parseInt(s.dataset.step, 10);
      if (sn === n) s.classList.add('active');
      if (sn < n) s.classList.add('done');
      else s.classList.remove('done');
    });
    Object.entries(panels).forEach(([k, el]) => el.classList.toggle('active', Number(k) === n));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const trip = { city: '', from: '', to: '', days: 0, extras: [], coupon: '' };

  /* ---------- STEP 1 ---------- */
  document.getElementById('trip-form').addEventListener('submit', (e) => {
    e.preventDefault();
    hidePageError();
    clearFieldErrors();

    let ok = true;
    trip.city = citySel.value;
    trip.from = fromIn.value;
    trip.to = toIn.value;

    if (!trip.city) { setFieldError('b-city', 'Please select a pickup city.'); ok = false; }
    if (!trip.from) { setFieldError('b-from', 'Please choose a pickup date.'); ok = false; }
    else if (trip.from < today) { setFieldError('b-from', 'Pickup date cannot be in the past.'); ok = false; }
    if (!trip.to) { setFieldError('b-to', 'Please choose a return date.'); ok = false; }
    else if (trip.from && trip.to <= trip.from) { setFieldError('b-to', 'Return date must be after the pickup date.'); ok = false; }

    if (ok) {
      trip.days = daysBetween(trip.from, trip.to);
      if (trip.days > RULES.maxRentalDays) {
        setFieldError('b-to', `Bookings longer than ${RULES.maxRentalDays} days are not allowed.`);
        ok = false;
      }
    }
    if (ok) goTo(2);
  });

  fromIn.addEventListener('change', () => {
    if (fromIn.value && toIn.value && toIn.value <= fromIn.value) toIn.value = '';
    updateDaysLine();
  });
  toIn.addEventListener('change', updateDaysLine);
  function updateDaysLine() {
    if (fromIn.value && toIn.value && toIn.value > fromIn.value) {
      daysLine.textContent = `Rental duration: ${daysBetween(fromIn.value, toIn.value)} day(s). Maximum is ${RULES.maxRentalDays} days.`;
    } else {
      daysLine.textContent = `Maximum rental duration is ${RULES.maxRentalDays} days.`;
    }
  }

  /* ---------- STEP 2 ---------- */
  const extrasList = document.getElementById('extras-list');
  extrasList.innerHTML = EXTRAS.map(ex => `
    <label class="checkbox-row" for="ex-${ex.id}">
      <input type="checkbox" id="ex-${ex.id}" value="${ex.id}" data-testid="extra-${ex.id}">
      <span>
        <b>${ex.label}</b> — ${ex.perDay ? formatINR(ex.perDay) + ' / day' : formatINR(ex.flat) + ' flat'}
        <br><span class="sub">${ex.desc}</span>
      </span>
    </label>`).join('');

  document.getElementById('back-1').addEventListener('click', () => goTo(1));
  document.getElementById('to-3').addEventListener('click', async () => {
    trip.extras = Array.from(extrasList.querySelectorAll('input:checked')).map(i => i.value);
    buildReview();
    goTo(3);
    await refreshQuote();
  });

  /* ---------- STEP 3: review, quote, coupon, payment ---------- */
  function buildReview() {
    document.getElementById('r-car').textContent = `${car.brand} ${car.model}`;
    document.getElementById('r-city').textContent = cityName(trip.city);
    document.getElementById('r-dates').textContent = `${trip.from} → ${trip.to}`;
    document.getElementById('r-days').textContent = `(${trip.days} day${trip.days === 1 ? '' : 's'})`;
    document.getElementById('r-extras').textContent = trip.extras.length
      ? trip.extras.map(id => EXTRAS.find(e => e.id === id).label).join(', ')
      : 'None';
  }

  async function refreshQuote() {
    const errEl = document.getElementById('coupon-error');
    const hasCoupon = !!document.getElementById('b-coupon').value.trim();
    try {
      const quote = await api('/bookings/quote', {
        method: 'POST',
        body: JSON.stringify({ carId: car.id, fromDate: trip.from, toDate: trip.to, extras: trip.extras, coupon: trip.coupon })
      });
      if (hasCoupon && !quote.couponApplied) {
        errEl.textContent = 'Invalid or expired coupon code.';
        errEl.style.display = 'block';
      } else {
        errEl.style.display = 'none';
      }
      document.getElementById('f-base').textContent = formatINR(quote.base);
      document.getElementById('f-extras').textContent = formatINR(quote.extrasTotal);
      document.getElementById('f-discount').textContent = quote.discount > 0 ? '- ' + formatINR(quote.discount) : '—';
      document.getElementById('f-gst').textContent = formatINR(quote.gst);
      document.getElementById('f-total').textContent = formatINR(quote.total);
      return quote;
    } catch (err) {
      showPageError(err.message);
      return null;
    }
  }

  document.getElementById('apply-coupon').addEventListener('click', () => {
    const code = document.getElementById('b-coupon').value.trim().toUpperCase();
    trip.coupon = code;
    refreshQuote();
  });

  document.getElementById('back-2').addEventListener('click', () => goTo(2));

  /* ---------- Payment + confirm ---------- */
  document.getElementById('payment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    hidePageError();
    clearFieldErrors();

    const nameIn = document.getElementById('p-name');
    const cardIn = document.getElementById('p-card');
    const expIn = document.getElementById('p-exp');
    const cvvIn = document.getElementById('p-cvv');

    let ok = true;

    if (!nameIn.value.trim()) { setFieldError('p-name', 'Please enter the name on the card.'); ok = false; }

    const cardDigits = cardIn.value.replace(/\D/g, '');
    if (cardDigits.length !== 16) {
      document.getElementById('err-card').textContent = 'Card number must be exactly 16 digits.';
      document.getElementById('err-card').closest('.field').classList.add('invalid');
      ok = false;
    } else if (!luhnValid(cardDigits)) {
      document.getElementById('err-card').textContent = 'Card number is invalid. Please double-check it.';
      document.getElementById('err-card').closest('.field').classList.add('invalid');
      ok = false;
    }

    const expMatch = expIn.value.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
    let expOk = !!expMatch;
    if (expOk) {
      const mm = parseInt(expMatch[1], 10);
      const yy = 2000 + parseInt(expMatch[2], 10);
      const endOfMonth = new Date(yy, mm, 0, 23, 59, 59);
      if (endOfMonth < new Date()) expOk = false;
    }
    if (!expOk) {
      const el = document.getElementById('err-exp');
      el.textContent = 'Enter a valid expiry (MM/YY) in the future.';
      el.closest('.field').classList.add('invalid');
      ok = false;
    }

    if (!/^\d{3}$/.test(cvvIn.value)) { setFieldError('p-cvv', 'CVV must be exactly 3 digits.'); ok = false; }
    if (!ok) return;

    // Confirm with the server — it re-validates everything (source of truth)
    const payBtn = document.getElementById('pay-btn');
    payBtn.disabled = true;
    payBtn.textContent = 'Processing…';
    try {
      const data = await api('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          carId: car.id, city: trip.city, fromDate: trip.from, toDate: trip.to,
          extras: trip.extras, coupon: trip.coupon
        })
      });
      const b = data.booking;

      document.getElementById('confirm-ref').textContent = b.bookingRef;
      document.getElementById('confirm-email').textContent = getAuth().user.email;
      document.getElementById('c-car').textContent = `${car.brand} ${car.model} — ${cityName(trip.city)}`;
      document.getElementById('c-dates').textContent = `${trip.from} → ${trip.to} (${b.days} day${b.days === 1 ? '' : 's'})`;
      document.getElementById('c-total').textContent = formatINR(b.total);

      steps.forEach(s => { s.classList.remove('active'); s.classList.add('done'); });
      Object.values(panels).forEach(p => p.classList.remove('active'));
      confirmPanel.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      showPageError(err.message);
    } finally {
      payBtn.disabled = false;
      payBtn.textContent = 'Pay & Confirm Booking';
    }
  });

  // Prefill dates if provided via URL
  const urlFrom = getParam('from');
  const urlTo = getParam('to');
  if (urlFrom) fromIn.value = urlFrom;
  if (urlTo) toIn.value = urlTo;
  updateDaysLine();
});
