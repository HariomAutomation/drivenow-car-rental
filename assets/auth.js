/* Login + Register - real API auth */
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  renderNav(page);
  renderFooter();

  /* ---------------- LOGIN ---------------- */
  if (page === 'login') {
    if (getAuth()) { location.href = 'mybookings.html'; return; }

    if (getParam('registered') === '1') {
      document.getElementById('reg-notice').classList.add('show');
    }

    const errBox = document.getElementById('login-error');
    const form = document.getElementById('login-form');
    const emailIn = document.getElementById('l-email');
    const passIn = document.getElementById('l-password');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFieldErrors();
      errBox.classList.remove('show');

      let ok = true;
      if (!EMAIL_RE.test(emailIn.value.trim())) { setFieldError('l-email', 'Please enter a valid email address.'); ok = false; }
      if (!passIn.value) { setFieldError('l-password', 'Please enter your password.'); ok = false; }
      if (!ok) return;

      try {
        const data = await api('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: emailIn.value.trim(), password: passIn.value })
        });
        setAuth(data.token, data.user);

        const redirect = getParam('redirect');
        const safe = redirect && /^[A-Za-z0-9_-]+\.html(\?.*)?$/.test(redirect);
        location.href = safe ? redirect : 'mybookings.html';
      } catch (err) {
        if (err.status === 401 || err.status === 400) {
          errBox.classList.add('show');
          passIn.value = '';
        } else {
          errBox.textContent = 'Something went wrong. Please try again.';
          errBox.classList.add('show');
        }
      }
    });
  }

  /* ---------------- REGISTER ---------------- */
  if (page === 'register') {
    const citySel = document.getElementById('r-city');
    CITIES.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id; opt.textContent = c.name;
      citySel.appendChild(opt);
    });

    const errBox = document.getElementById('reg-error');
    const okBox = document.getElementById('reg-success');
    const form = document.getElementById('register-form');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFieldErrors();
      errBox.classList.remove('show');
      okBox.classList.remove('show');

      const name = document.getElementById('r-name').value.trim();
      const email = document.getElementById('r-email').value.trim();
      const phone = document.getElementById('r-phone').value.trim();
      const city = citySel.value;
      const pass = document.getElementById('r-pass').value;
      const confirm = document.getElementById('r-confirm').value;

      let ok = true;
      if (name.length < 3) { setFieldError('r-name', 'Please enter your full name (at least 3 characters).'); ok = false; }
      if (!EMAIL_RE.test(email)) { setFieldError('r-email', 'Please enter a valid email address.'); ok = false; }
      if (!/^\d{10}$/.test(phone)) { setFieldError('r-phone', 'Mobile number must be exactly 10 digits (numbers only).'); ok = false; }
      if (!city) { setFieldError('r-city', 'Please select your home city.'); ok = false; }
      const passOk = pass.length >= 8 && /[A-Z]/.test(pass) && /\d/.test(pass);
      if (!passOk) { setFieldError('r-pass', 'Password must be at least 8 characters and contain an uppercase letter and a number.'); ok = false; }
      else if (pass !== confirm) { setFieldError('r-confirm', 'Passwords do not match.'); ok = false; }
      if (!ok) return;

      try {
        const data = await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, phone, city, password: pass })
        });
        // Auto sign-in
        setAuth(data.token, data.user);
        okBox.classList.add('show');
        setTimeout(() => { location.href = 'mybookings.html'; }, 1000);
      } catch (err) {
        if (err.status === 409) {
          const el = document.getElementById('err-reg-email');
          el.textContent = err.message;
          el.closest('.field').classList.add('invalid');
        } else {
          errBox.textContent = err.message || 'Registration failed. Please try again.';
          errBox.classList.add('show');
        }
      }
    });
  }
});
