/* Contact page — posts to the real API */
document.addEventListener('DOMContentLoaded', () => {
  renderNav('contact');
  renderFooter();

  const form = document.getElementById('contact-form');
  const okBox = document.getElementById('contact-success');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors();
    okBox.classList.remove('show');

    const name = document.getElementById('c-name').value.trim();
    const email = document.getElementById('c-email').value.trim();
    const msg = document.getElementById('c-msg').value.trim();

    let ok = true;
    if (name.length < 3) { setFieldError('c-name', 'Please enter your full name (at least 3 characters).'); ok = false; }
    if (!EMAIL_RE.test(email)) { setFieldError('c-email', 'Please enter a valid email address.'); ok = false; }
    if (msg.length < 10) { setFieldError('c-msg', 'Please write a message of at least 10 characters.'); ok = false; }
    if (!ok) return;

    submitBtn.disabled = true;
    try {
      await api('/contact', {
        method: 'POST',
        body: JSON.stringify({ name, email, message: msg })
      });
      form.reset();
      okBox.classList.add('show');
    } catch (err) {
      // Server-side validation messages map back to the fields
      const m = (err.message || '').toLowerCase();
      if (m.includes('name')) setFieldError('c-name', err.message);
      else if (m.includes('email')) setFieldError('c-email', err.message);
      else if (m.includes('message')) setFieldError('c-msg', err.message);
      else setFieldError('c-msg', err.message);
    } finally {
      submitBtn.disabled = false;
    }
  });
});
