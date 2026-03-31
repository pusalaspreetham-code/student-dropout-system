/**
 * login.js – Admin Portal Login
 * Base URL: http://localhost:3000/api/admin
 */

const BASE_URL = 'http://localhost:3000/api/admin';

/* ── Redirect if already logged in ── */
if (sessionStorage.getItem('admin_id')) {
  window.location.href = 'dashboard.html';
}

/* ── DOM Refs ── */
const form      = document.getElementById('login-form');
const adminInput = document.getElementById('admin_id');
const passInput  = document.getElementById('password');
const loginBtn   = document.getElementById('login-btn');
const alertArea  = document.getElementById('alert-area');

/* ── Show Alert ── */
function showAlert(message, type = 'error') {
  const icons = { error: '⚠️', success: '✅', info: 'ℹ️' };
  alertArea.innerHTML = `
    <div class="alert alert-${type}">
      <span>${icons[type] || '•'}</span>
      <span>${message}</span>
    </div>
  `;
}

function clearAlert() {
  alertArea.innerHTML = '';
}

/* ── Set Loading State ── */
function setLoading(loading) {
  if (loading) {
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="spinner"></span> Signing in…';
  } else {
    loginBtn.disabled = false;
    loginBtn.innerHTML = 'Sign In';
  }
}

/* ── Form Submit ── */
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();

  const admin_id = adminInput.value.trim();
  const password = passInput.value.trim();

  if (!admin_id || !password) {
    showAlert('Please enter both Admin ID and Password.');
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_id, password }),
    });

    const data = await response.json();

    if (response.ok) {
      /* Store admin info in sessionStorage */
      sessionStorage.setItem('admin_id', admin_id);
      sessionStorage.setItem('admin_name', data.name || admin_id);

      showAlert('Login successful! Redirecting…', 'success');

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 700);
    } else {
      showAlert(data.message || 'Invalid credentials. Please try again.');
      setLoading(false);
    }
  } catch (err) {
    showAlert('Unable to reach the server. Please check your connection.');
    console.error('Login error:', err);
    setLoading(false);
  }
});

/* ── Clear alert on input ── */
adminInput.addEventListener('input', clearAlert);
passInput.addEventListener('input', clearAlert);