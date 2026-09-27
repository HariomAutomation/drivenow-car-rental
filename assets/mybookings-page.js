/* My Bookings - from the API */
document.addEventListener('DOMContentLoaded', async () => {
  renderNav('mybookings');
  renderFooter();

  if (!getAuth()) {
    location.href = 'login.html?redirect=mybookings.html';
    return;
  }

  const tbody = document.getElementById('bookings-tbody');
  const root = document.getElementById('bookings-root');

  async function load() {
    try {
      const data = await api('/bookings');
      const mine = data.bookings;

      if (mine.length === 0) {
        root.innerHTML = `
          <div class="empty-state card">
            <div style="font-size:40px">\u{1F697}</div>
            <h2>No bookings yet</h2>
            <p style="color:var(--muted); margin:8px 0 18px">Find a car and make your first booking.</p>
            <a class="btn" href="cars.html" data-testid="find-car-btn">Find a Car</a>
          </div>`;
        return;
      }

      root.innerHTML = `
        <div class="table-wrap">
          <table data-testid="bookings-table">
            <thead>
              <tr><th>Reference</th><th>Car</th><th>City</th><th>Dates</th><th>Total</th><th>Payment</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody id="bookings-tbody"></tbody>
          </table>
        </div>`;

      const tbody2 = document.getElementById('bookings-tbody');
      const today = todayISO();
      tbody2.innerHTML = mine.map(b => {
        const canCancel = b.status === 'CONFIRMED' && b.fromDate > today;
        const badge = {
          CONFIRMED: 'badge-confirmed',
          CANCELLED: 'badge-cancelled',
          COMPLETED: 'badge-completed',
          PENDING: 'badge-pending'
        }[b.status] || 'badge-pending';
        return `
          <tr data-booking-ref="${b.bookingRef}">
            <td><b>${b.bookingRef}</b></td>
            <td>${b.carName}</td>
            <td>${cityName(b.city)}</td>
            <td>${b.fromDate} \u{2192} ${b.toDate}<br><span style="color:var(--muted); font-size:12px">${b.days} day${b.days === 1 ? '' : 's'}</span></td>
            <td><b>${formatINR(b.total)}</b></td>
            <td data-testid="payment-${b.bookingRef}">${b.paymentMethod === 'cash' ? 'Cash at pickup' : 'Card'}</td>
            <td><span class="badge ${badge}" data-testid="status-${b.bookingRef}">${b.status}</span></td>
            <td>${canCancel
              ? `<button class="btn btn-sm btn-danger cancel-btn" data-ref="${b.bookingRef}" data-testid="cancel-${b.bookingRef}">Cancel</button>`
              : '-'}</td>
          </tr>`;
      }).join('');
    } catch (err) {
      root.innerHTML = `<div class="empty-state card">Could not load bookings: ${err.message}</div>`;
    }
  }

  document.getElementById('bookings-root').addEventListener('click', async (e) => {
    const btn = e.target.closest('.cancel-btn');
    if (!btn) return;
    const ref = btn.dataset.ref;
    if (!confirm(`Cancel booking ${ref}? This cannot be undone.`)) return;

    btn.disabled = true;
    try {
      await api('/bookings/' + encodeURIComponent(ref) + '/cancel', { method: 'PATCH' });
      await load();
    } catch (err) {
      alert('Could not cancel: ' + err.message);
      btn.disabled = false;
    }
  });

  load();
});
