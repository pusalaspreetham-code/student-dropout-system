(function () {
  'use strict';

  const mentorIdInput = document.getElementById('mentor-id');
  const passwordInput = document.getElementById('password');
  const loginBtn      = document.getElementById('login-btn');
  const errorMsg      = document.getElementById('error-msg');
  const errorText     = document.getElementById('error-text');

  function setLoading(isLoading) {
    loginBtn.disabled = isLoading;
    const label = loginBtn.querySelector('.btn-label');

    if (isLoading) {
      label.textContent = 'Signing in…';
    } else {
      label.textContent = 'Sign In';
    }
  }

  function showError(message) {
    errorText.textContent = message;
    errorMsg.classList.remove('hidden');
  }

  function hideError() {
    errorMsg.classList.add('hidden');
  }

  async function handleLogin() {
    const id = mentorIdInput.value.trim();
    const password = passwordInput.value;

    if (!id || !password) {
      showError('Please fill in all fields.');
      return;
    }

    hideError();
    setLoading(true);

    try {
      // ✅ Fix 1: Full URL with port 3000 and /api/mentor/login
      const response = await fetch('http://localhost:3000/api/mentor/login', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentor_id: id,   // ✅ Fix 2: Changed "id" to "mentor_id" to match controller
          password: password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showError(data.message || 'Invalid mentor credentials');
        setLoading(false);
        return;
      }

      // ✅ Fix 3: Map the successful response to SessionStorage
      sessionStorage.setItem('mentorId', id);
      sessionStorage.setItem('mentorName', data.name || id); 

      window.location.href = 'dashboard.html';

    } catch (err) {
      console.error('Login error:', err);
      showError('Server not reachable. Ensure backend is running on port 3000.');
      setLoading(false);
    }
}

  loginBtn.addEventListener('click', handleLogin);

  [mentorIdInput, passwordInput].forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleLogin();
    });
    input.addEventListener('input', hideError);
  });

})();