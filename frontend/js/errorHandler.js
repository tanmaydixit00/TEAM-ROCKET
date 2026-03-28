// ============================================================
//  Centralized Error Handling Utilities — MiniCloud
//
//  Provides:
//  - showToast(message, type)  — non-blocking UI notification
//  - showError(message)        — convenience wrapper for errors
//  - showSuccess(message)      — convenience wrapper for success
//  - logError(context, error)  — structured console logging
//  - friendlyFirebaseError(err)— human-readable Firebase messages
// ============================================================

// ── Toast container (created once on first use) ───────────
function getToastContainer() {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    Object.assign(container.style, {
      position:   'fixed',
      bottom:     '24px',
      right:      '24px',
      display:    'flex',
      flexDirection: 'column',
      gap:        '10px',
      zIndex:     '9999',
      maxWidth:   '360px',
    });
    document.body.appendChild(container);
  }
  return container;
}

// ── Show a toast notification ─────────────────────────────
// type: 'error' | 'success' | 'info'
export function showToast(message, type = 'info') {
  const container = getToastContainer();

  const colors = {
    error:   { bg: '#ff6b6b', icon: '✕' },
    success: { bg: '#51cf66', icon: '✓' },
    info:    { bg: '#667eea', icon: 'ℹ' },
  };
  const { bg, icon } = colors[type] || colors.info;

  const toast = document.createElement('div');
  Object.assign(toast.style, {
    display:      'flex',
    alignItems:   'flex-start',
    gap:          '10px',
    padding:      '12px 16px',
    background:   bg,
    color:        '#fff',
    borderRadius: '8px',
    fontSize:     '14px',
    lineHeight:   '1.4',
    boxShadow:    '0 4px 16px rgba(0,0,0,0.35)',
    opacity:      '0',
    transform:    'translateY(10px)',
    transition:   'opacity 0.25s ease, transform 0.25s ease',
    cursor:       'pointer',
  });

  toast.innerHTML = `<span style="font-weight:700;flex-shrink:0;">${icon}</span><span>${message}</span>`;

  // Dismiss on click
  toast.addEventListener('click', () => dismissToast(toast));

  container.appendChild(toast);

  // Trigger enter animation
  requestAnimationFrame(() => {
    toast.style.opacity   = '1';
    toast.style.transform = 'translateY(0)';
  });

  // Auto-dismiss after 5 seconds (errors stay for 7 seconds)
  const delay = type === 'error' ? 7000 : 5000;
  setTimeout(() => dismissToast(toast), delay);

  return toast;
}

function dismissToast(toast) {
  toast.style.opacity   = '0';
  toast.style.transform = 'translateY(10px)';
  setTimeout(() => toast.remove(), 300);
}

// ── Convenience wrappers ──────────────────────────────────
export function showError(message) {
  return showToast(message, 'error');
}

export function showSuccess(message) {
  return showToast(message, 'success');
}

// ── Structured console logging ────────────────────────────
export function logError(context, error) {
  console.error(`[MiniCloud] ${context}:`, error);
}

// ── Human-readable Firebase / Firestore error messages ────
export function friendlyFirebaseError(error) {
  const code = error?.code || '';
  const map = {
    // Auth
    'auth/user-not-found':        'No account found for that email address.',
    'auth/wrong-password':        'Incorrect password. Please try again.',
    'auth/email-already-in-use':  'An account with this email already exists.',
    'auth/weak-password':         'Password must be at least 6 characters.',
    'auth/invalid-email':         'Please enter a valid email address.',
    'auth/too-many-requests':     'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed':'Network error. Check your internet connection.',
    'auth/popup-closed-by-user':  'Sign-in popup was closed before completing.',
    // Storage
    'storage/unauthorized':       'You do not have permission to access this file.',
    'storage/canceled':           'File operation was cancelled.',
    'storage/object-not-found':   'File not found in storage.',
    'storage/quota-exceeded':     'Storage quota exceeded.',
    'storage/bucket-not-found':   'Firebase Storage is not initialized. Open Firebase Console > Storage > Get started.',
    'storage/retry-limit-exceeded':'Upload timed out. Please try again.',
    // Firestore
    'permission-denied':          'You do not have permission to perform this action.',
    'not-found':                  'The requested document was not found.',
    'unavailable':                'Service temporarily unavailable. Please try again.',
  };
  return map[code] || error?.message || 'An unexpected error occurred.';
}
