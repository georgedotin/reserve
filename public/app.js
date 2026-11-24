const form = document.querySelector('#invite-form');
const status = document.querySelector('#status');
const phone = document.querySelector('#phone');
phone.addEventListener('input', () => phone.setCustomValidity(''));
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!/^\+?[\d\s().-]+$/.test(phone.value) || phone.value.replace(/\D/g, '').length < 7 || phone.value.replace(/\D/g, '').length > 15) {
    phone.setCustomValidity('Enter a valid phone number, including your country code.'); phone.reportValidity(); return;
  }
  const button = form.querySelector('button');
  button.disabled = true; status.textContent = 'Sending your request…';
  const data = Object.fromEntries(new FormData(form)); data.helicopter = form.helicopter.checked;
  try {
    const response = await fetch('/api/invites', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || 'Your request could not be saved. Please try again.');
    form.hidden = true; const success = document.querySelector('#success'); success.hidden = false; success.focus();
  } catch (error) {
    status.textContent = error instanceof TypeError || error instanceof SyntaxError ? 'We couldn’t reach the invitation service. Please try again shortly.' : error.message;
    status.focus();
  } finally { button.disabled = false; }
});
