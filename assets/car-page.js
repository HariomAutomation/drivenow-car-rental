/* Car detail page - car data from the API */
document.addEventListener('DOMContentLoaded', async () => {
  renderNav('cars');
  renderFooter();

  const root = document.getElementById('car-detail-root');
  const id = getParam('id');
  if (!id) { renderNotFound(root); return; }

  // carry forward dates/city from the search so booking.html can prefill them
  const urlFrom = getParam('from');
  const urlTo = getParam('to');
  const urlCity = getParam('city');
  let carryQs = '';
  if (urlFrom && urlTo) carryQs += `&from=${encodeURIComponent(urlFrom)}&to=${encodeURIComponent(urlTo)}`;
  if (urlCity) carryQs += `&city=${encodeURIComponent(urlCity)}`;

  let car;
  try {
    car = await api('/cars/' + encodeURIComponent(id));
  } catch (err) {
    renderNotFound(root);
    return;
  }

  const emoji = ({ Hatchback: '\u{1F697}', Sedan: '\u{1F699}', SUV: '\u{1F690}', MPV: '\u{1F690}', Luxury: '\u{1F3CE}' }[car.type] || '\u{1F697}');

  root.innerHTML = `
    <p><a href="cars.html">&larr; Back to all cars</a></p>
    <h1 class="page-title" style="margin-top:10px">${car.brand} ${car.model} <span class="rating">\u{2B50} ${car.rating}</span></h1>
    <p class="page-sub">${car.type} \u{2022} driven by ${car.trips}+ customers</p>

    <div style="display:grid; grid-template-columns: 1.4fr 1fr; gap:24px; align-items:start" class="detail-grid">
      <div class="card" style="padding:0; overflow:hidden">
        <div style="height:260px; display:flex; align-items:center; justify-content:center; font-size:120px; background:linear-gradient(135deg, ${car.color}, #0d1b3e)">
          <span aria-hidden="true">${emoji}</span>
        </div>
        <div style="padding:20px">
          <h3>Specifications</h3>
          <div class="table-wrap" style="box-shadow:none; margin-top:10px">
            <table data-testid="spec-table">
              <tr><td>Type</td><td><b>${car.type}</b></td></tr>
              <tr><td>Seats</td><td><b>${car.seats}</b></td></tr>
              <tr><td>Fuel</td><td><b>${car.fuel}</b></td></tr>
              <tr><td>Transmission</td><td><b>${car.transmission}</b></td></tr>
              <tr><td>Available in</td><td><b>${car.cities.map(cityName).join(', ')}</b></td></tr>
              <tr><td>Kilometres</td><td><b>Unlimited</b></td></tr>
            </table>
          </div>
        </div>
      </div>

      <div>
        <div class="card">
          <div class="price-tag" style="font-size:26px" data-testid="car-price">${formatINR(car.pricePerDay)} <span class="per" style="font-size:14px">/ day</span></div>
          <p class="hint" style="margin:6px 0 4px">GST (18%) and any add-ons are shown before you pay.</p>
          <p class="hint" style="margin-bottom:16px">${RULES.cancelWindowNote}.</p>
          ${urlFrom && urlTo ? `<p class="hint" style="margin-bottom:8px">Dates from your search: <b>${urlFrom}</b> to <b>${urlTo}</b> (already filled in the booking form)</p>` : ''}
          <a class="btn btn-block" href="booking.html?carId=${car.id}${carryQs}" data-testid="book-now-btn">Book Now</a>
        </div>
        <div class="card" style="margin-top:16px">
          <h3>Included with every rental</h3>
          <ul class="feature-list" style="font-size:13.5px">
            <li>Unlimited kilometres</li>
            <li>24\u{00D7}7 roadside assistance</li>
            <li>Sanitised car before every trip</li>
          </ul>
        </div>
      </div>
    </div>

    <style>@media (max-width: 780px) { .detail-grid { grid-template-columns: 1fr !important; } }</style>
  `;
});

function renderNotFound(root) {
  root.innerHTML = `
    <div class="empty-state card">
      <div style="font-size:40px">\u{1F6AB}</div>
      <h1 class="page-title">Car not found</h1>
      <p class="page-sub">The car you're looking for doesn't exist.</p>
      <a class="btn" href="cars.html" data-testid="back-to-cars">Browse all cars</a>
    </div>`;
}
