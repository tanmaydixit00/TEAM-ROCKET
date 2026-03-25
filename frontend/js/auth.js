import { authAPI } from './api.js';

// Redirect to dashboard if already logged in
if (localStorage.getItem('token')) {
  window.location.href = 'index.html';
}

// Tab switching
document.querySelectorAll('.auth-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const targetTab = tab.dataset.tab;

    document.querySelectorAll('.auth-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');

    document.querySelectorAll('.auth-form').forEach((form) => form.classList.remove('active'));
    document.getElementById(targetTab + 'Form')?.classList.add('active');

    const err = document.getElementById('authError');
    if (err) err.style.display = 'none';
  });
});

// Password visibility toggle
document.querySelectorAll('.toggle-password').forEach((btn) => {
  btn.addEventListener('click', () => {
    const wrapper = btn.closest('.password-input');
    const input = wrapper?.querySelector('input');
    const icon = btn.querySelector('i');
    if (!input || !icon) return;

    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  });
});

// Password strength indicator
const signupPassword = document.getElementById('signupPassword');
if (signupPassword) {
  signupPassword.addEventListener('input', (e) => {
    const password = e.target.value;
    const strengthBar = document.querySelector('.strength-bar');
    if (!strengthBar) return;

    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password) || /[^a-zA-Z0-9]/.test(password)) strength += 25;

    strengthBar.style.width = strength + '%';
  });
}

function showError(message) {
  const errorDiv = document.getElementById('authError');
  if (!errorDiv) return;
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

// Login form submission
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('loginEmail')?.value?.trim();
  const password = document.getElementById('loginPassword')?.value;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    }

    const data = await authAPI.login(email, password);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.location.href = 'index.html';
  } catch (error) {
    showError(error.message);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
    }
  }
});

// Signup form submission
document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('signupName')?.value?.trim();
  const email = document.getElementById('signupEmail')?.value?.trim();
  const password = document.getElementById('signupPassword')?.value;

  if (!password || password.length < 8) {
    showError('Password must be at least 8 characters long.');
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
    }

    const data = await authAPI.register(name, email, password);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.location.href = 'index.html';
  } catch (error) {
    showError(error.message);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    }
  }
});
