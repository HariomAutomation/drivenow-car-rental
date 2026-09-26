/* Cars listing — server-side filtering via the API, client-side pagination */
document.addEventListener('DOMContentLoaded', () => {
  renderNav('cars');
  renderFooter();

  const PAGE_SIZE = 6;
  let currentPage = 1;
  let allFiltered = [];

  const citySel = document.getElementById('f-city');
  const typeSel = document.getElementById('f-type');
  const seatsSel = document.getElementById('f-seats');
  const sortSel = document.getElementById('f-sort');
  const grid = document.getElementById('car-grid');
  const metaEl = document.getElementById('result-meta');
  const pagEl = document.getElementById('pagination');
  const datesNote = document.getElementById('dates-note');

  CITIES.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id; opt.textContent = c.name;
    citySel.appendChild(opt);
  });
  CAR_TYPES.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t; opt.textContent = t;
    typeSel.appendChild(opt);
  });

  // URL params from home search
  const urlCity = getParam('city');
  const urlFrom = getParam('from');
  const urlTo = getParam('to');
  if (urlCity) citySel.value = urlCity;
  if (urlFrom && urlTo) {
    datesNote.textContent = `Showing availability for ${urlFrom} to ${urlTo} — cars already booked for these dates are hidden.`;
    datesNote.classList.add('show');
  }

  const emojiFor = (t) => ({ Hatchback: '🚗', Sedan: '🚙', SUV: '🚐', MPV: '🚐', Luxury: '🏎️' }[t] || '🚗');

  async function loadCars() {
    const qs = new URLSearchParams();
    if (citySel.value) qs.set('city', citySel.value);
    if (typeSel.value) qs.set('type', typeSel.value);
    if (seatsSel.value) qs.set('seats', seatsSel.value);
    qs.set('sort', sortSel.value || 'rating');
    if (urlFrom && urlTo) { qs.set('from', urlFrom); qs.set('to', urlTo); }

    grid.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
    try {
      const data = await api('/cars?' + qs.toString());
      allFiltered = data.cars;
      currentPage = 1;
      render();
    } catch (err) {
      grid.innerHTML = `<div class="empty-state card" style="grid-column:1/-1">Could not load cars: ${err.message}</div>`;
    }
  }

  function render() {
    const totalPages = Math.max(1, Math.ceil(allFiltered.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = allFiltered.slice(start, start + PAGE_SIZE);

    metaEl.textContent = `${allFiltered.length} car${allFiltered.length === 1 ? '' : 's'} found${citySel.value ? ' in ' + cityName(citySel.value) : ''}`;

    if (allFiltered.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1" data-testid="no-results">
        <div style="font-size:40px">🔍</div>
        <p>No cars match your filters. Try resetting them.</p></div>`;
    } else {
      grid.innerHTML = pageItems.map(car => `
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
            <div class="city-list">📍 ${car.cities.map(cityName).join(', ')}</div>
            <div class="car-footer">
              <span class="price-tag">${formatINR(car.pricePerDay)} <span class="per">/ day</span></span>
              <a class="btn btn-sm" href="car.html?id=${car.id}" data-testid="view-${car.id}">View Details</a>
            </div>
          </div>
        </div>`).join('');
    }

    let html = `<button class="page-link" id="prev-page" data-testid="prev-page" ${currentPage === 1 ? 'disabled' : ''}>‹ Prev</button>`;
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="page-link ${i === currentPage ? 'current' : ''}" data-page="${i}" data-testid="page-${i}">${i}</button>`;
    }
    html += `<button class="page-link" id="next-page" data-testid="next-page" ${currentPage === totalPages ? 'disabled' : ''}>Next ›</button>`;
    pagEl.innerHTML = totalPages > 1 ? html : '';
  }

  [citySel, typeSel, seatsSel, sortSel].forEach(el => el.addEventListener('change', loadCars));
  document.getElementById('f-reset').addEventListener('click', () => {
    citySel.value = ''; typeSel.value = ''; seatsSel.value = ''; sortSel.value = 'rating';
    loadCars();
  });
  pagEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.id === 'prev-page' && currentPage > 1) currentPage--;
    else if (btn.id === 'next-page') currentPage++;
    else if (btn.dataset.page) currentPage = parseInt(btn.dataset.page, 10);
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  loadCars();
});
