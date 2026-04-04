import { auth } from './firebase-init.js';
import { logError } from './errorHandler.js';

// Redirect to dashboard if already logged in
auth.onAuthStateChanged((user) => {
  if (user) {
    window.location.href = 'index.html';
  }
});

// ── Tab switching ─────────────────────────────────────────
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

// ── Password visibility toggle ────────────────────────────
document.querySelectorAll('.toggle-password').forEach((btn) => {
  btn.addEventListener('click', () => {
    const wrapper = btn.closest('.password-input');
    const input = wrapper?.querySelector('input');
    const icon = btn.querySelector('i');
    if (!input || !icon) return;

    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
  });
});

// ── Password strength indicator ───────────────────────────
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

// ── Error display ─────────────────────────────────────────
function showError(message) {
  const errorDiv = document.getElementById('authError');
  if (!errorDiv) return;
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

// Map Firebase error codes to user-friendly messages
function friendlyError(code) {
  const map = {
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your internet connection.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed before completing.',
    'auth/popup-blocked': 'Sign-in popup was blocked by the browser. Please allow popups for this site.',
    'auth/cancelled-popup-request': 'Only one sign-in popup can be open at a time.',
    'auth/account-exists-with-different-credential': 'An account already exists with the same email but a different sign-in method.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

// ── Login ─────────────────────────────────────────────────
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

    await auth.signInWithEmailAndPassword(email, password);
    // onAuthStateChanged will redirect to index.html
  } catch (error) {
    logError('Login', error);
    showError(friendlyError(error.code));
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
    }
  }
});

// ── Sign Up ───────────────────────────────────────────────
document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('signupName')?.value?.trim();
  const email = document.getElementById('signupEmail')?.value?.trim();
  const password = document.getElementById('signupPassword')?.value;
  const submitBtn = e.target.querySelector('button[type="submit"]');

  if (!password || password.length < 8) {
    showError('Password must be at least 8 characters long.');
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
    }

    const { user } = await auth.createUserWithEmailAndPassword(email, password);

    // Set display name
    if (name) {
      await user.updateProfile({ displayName: name });
    }

    // onAuthStateChanged will redirect to index.html
  } catch (error) {
    logError('Sign up', error);
    showError(friendlyError(error.code));
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    }
  }
});

// ── Google Sign-In ────────────────────────────────────────
document.querySelectorAll('.social-btn.google').forEach((btn) => {
  btn.addEventListener('click', async () => {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
      // onAuthStateChanged will redirect to index.html
    } catch (error) {
      logError('Google sign-in', error);
      showError(friendlyError(error.code));
    }
  });
});

// ── GitHub Sign-In ────────────────────────────────────────
document.querySelectorAll('.social-btn.github').forEach((btn) => {
  btn.addEventListener('click', async () => {
    try {
      const provider = new firebase.auth.GithubAuthProvider();
      await auth.signInWithPopup(provider);
      // onAuthStateChanged will redirect to index.html
    } catch (error) {
      logError('GitHub sign-in', error);
      showError(friendlyError(error.code));
    }
  });
});
