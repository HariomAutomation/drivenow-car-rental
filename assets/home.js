/* Home page — search + featured cars from the API */
document.addEventListener('DOMContentLoaded', async () => {
  renderNav('home');
  renderFooter();

  const citySel = document.getElementById('s-city');
  CITIES.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    citySel.appendChild(opt);
  });

  const from = document.getElementById('s-from');
  const to = document.getElementById('s-to');
  const today = todayISO();
  from.min = today;
  to.min = today;

  const errBox = document.getElementById('search-error');

  document.getElementById('search-form').addEventListener('submit', (e) => {
    errBox.classList.remove('show');
    if (!citySel.value || !from.value || !to.value) {
      e.preventDefault();
      errBox.textContent = 'Please select a city, pickup date and return date.';
      errBox.classList.add('show');
      return;
    }
    if (to.value <= from.value) {
      e.preventDefault();
      errBox.textContent = 'Return date must be after the pickup date.';
      errBox.classList.add('show');
    }
  });

  // Featured cars — top 3 by rating from the API
  const emojiFor = (t) => ({ Hatchback: '🚗', Sedan: '🚙', SUV: '🚐', MPV: '🚐', Luxury: '🏎️' }[t] || '🚗');
  try {
    const data = await api('/cars?sort=rating');
    const featured = data.cars.slice(0, 3);
    document.getElementById('featured-grid').innerHTML = featured.map(car => `
      <div class="card car-card" data-testid="car-card-${car.id}">
        <div class="car-visual" style="background:linear-gradient(135deg, ${car.color}, #0d1b3e)">
          <span aria-hidden="true">${emojiFor(car.type)}</span>
        </div>
        <div class="car-body">
          <div class="car-title">${car.brand} ${car.model}</div>
          <div class="car-type">${car.type} • ${car.fuel} • ${car.transmission}</div>
          <div class="specs">
            <span class="spec-chip">👤 ${car.seats} seats</span>
            <span class="spec-chip">⭐ ${car.rating}</span>
            <span class="spec-chip">${car.trips} trips</span>
          </div>
          <div class="car-footer">
            <span class="price-tag">${formatINR(car.pricePerDay)} <span class="per">/ day</span></span>
            <a class="btn btn-sm" href="car.html?id=${car.id}" data-testid="view-${car.id}">View Details</a>
          </div>
        </div>
      </div>`).join('');
  } catch (err) {
    document.getElementById('featured-grid').innerHTML =
      `<div class="empty-state card" style="grid-column:1/-1">Could not load the fleet. Is the API running?</div>`;
  }
});
