import { firebaseConfig } from './config.js';

// Initialize Firebase (only once — guard against double-init)
if (!firebase.apps.length) {
  try {
    firebase.initializeApp(firebaseConfig);
  } catch (e) {
    const errorDiv = document.getElementById('authError');
    if (errorDiv) {
      errorDiv.textContent = 'Firebase init failed: ' + e.message;
      errorDiv.style.display = 'block';
    }
  }
}

const auth = firebase.auth();

// Redirect to dashboard if already signed in
auth.onAuthStateChanged((user) => {
  if (user) {
    window.location.replace('/');
  }
}, (err) => {
  const errorDiv = document.getElementById('authError');
  if (errorDiv) {
    errorDiv.textContent = 'Auth error: ' + err.message;
    errorDiv.style.display = 'block';
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
function friendlyError(code, message) {
  const map = {
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your internet connection.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed before completion.',
    'auth/popup-blocked': 'Popup was blocked by your browser. Allow popups and try again.',
    'auth/cancelled-popup-request': 'Another sign-in popup is already open.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase Auth settings.',
  };
  return map[code] || `${message || 'Something went wrong.'} (Code: ${code || 'unknown'})`;
}

async function signInWithProvider(providerType, buttonEl) {
  const originalHtml = buttonEl?.innerHTML;
  let provider;

  if (providerType === 'google') {
    provider = new firebase.auth.GoogleAuthProvider();
  } else if (providerType === 'github') {
    provider = new firebase.auth.GithubAuthProvider();
  } else {
    showError('Unsupported sign-in provider.');
    return;
  }

  try {
    if (buttonEl) {
      buttonEl.disabled = true;
      buttonEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
    }

    await auth.signInWithPopup(provider);
  } catch (error) {
    console.error('[Auth] Social login error:', error);
    showError(friendlyError(error.code));
  } finally {
    if (buttonEl) {
      buttonEl.disabled = false;
      buttonEl.innerHTML = originalHtml;
    }
  }
}

// ── Social Login ──────────────────────────────────────────
document.querySelector('.social-btn.google')?.addEventListener('click', (e) => {
  signInWithProvider('google', e.currentTarget);
});

document.querySelector('.social-btn.github')?.addEventListener('click', (e) => {
  signInWithProvider('github', e.currentTarget);
});

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
  } catch (error) {
    console.error('[Auth] Login error:', error.code, error.message);
    showError(friendlyError(error.code, error.message));
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

    if (name) {
      await user.updateProfile({ displayName: name });
    }
  } catch (error) {
    console.error('[Auth] Signup error:', error.code, error.message);
    showError(friendlyError(error.code, error.message));
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    }
  }
});
