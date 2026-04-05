// ============================================================
//  Firebase + API Configuration
//
//  Priority order for value resolution:
//    1. window.__ENV__  — injected at deploy time by your hosting
//                         platform's build step or a server-side
//                         template (recommended for Vercel, Netlify,
//                         Railway, Render, etc.)
//    2. process.env.*  — available in Node/bundler environments
//                         (Vite, Webpack, etc.) with VITE_ prefix
//    3. Hardcoded defaults — Firebase keys are public by design;
//       security is enforced by Firestore & Storage rules, not key secrecy.
//
//  To configure environment-specific values on Vercel:
//    Dashboard → Your Project → Settings → Environment Variables
//    Add each VITE_FIREBASE_* and VITE_API_BASE_URL variable.
//
//  To inject at runtime without a bundler, add this before your
//  script tags in index.html / login.html:
//
//    <script>
//      window.__ENV__ = {
//        FIREBASE_API_KEY:            "...",
//        FIREBASE_AUTH_DOMAIN:        "...",
//        FIREBASE_PROJECT_ID:         "...",
//        FIREBASE_STORAGE_BUCKET:     "...",
//        FIREBASE_MESSAGING_SENDER_ID:"...",
//        FIREBASE_APP_ID:             "...",
//        API_BASE_URL:                "https://your-backend.onrender.com/api"
//      };
//    </script>
// ============================================================

/** Reads a value from window.__ENV__, process.env (VITE_ prefix), or a fallback. */
function env(key, fallback = '') {
  // 1. Runtime injection (window.__ENV__)
  if (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__[key]) {
    return window.__ENV__[key];
  }
  // 2. Build-time (Vite / bundler exposes process.env.VITE_*)
  if (typeof process !== 'undefined' && process.env) {
    const viteKey = `VITE_FIREBASE_${key}` in process.env
      ? `VITE_FIREBASE_${key}`
      : `VITE_${key}` in process.env
        ? `VITE_${key}`
        : null;
    if (viteKey && process.env[viteKey]) return process.env[viteKey];
  }
  return fallback;
}

// ── Firebase config ────────────────────────────────────────────────────────
export const firebaseConfig = {
  apiKey:            env('API_KEY',             'AIzaSyAgfMgkTinrNo-yauAGyZDY7grTpmo8i2c'),
  authDomain:        env('AUTH_DOMAIN',         'minicloud-6df35.firebaseapp.com'),
  projectId:         env('PROJECT_ID',          'minicloud-6df35'),
  storageBucket:     env('STORAGE_BUCKET',      'minicloud-6df35.firebasestorage.app'),
  messagingSenderId: env('MESSAGING_SENDER_ID', '953691126064'),
  appId:             env('APP_ID',              '1:953691126064:web:754a80c8abf23aa10e30f5'),
};

// ── Backend API base URL ───────────────────────────────────────────────────
// Set VITE_API_BASE_URL (or window.__ENV__.API_BASE_URL) to your deployed
// backend URL, e.g. "https://minicloud-api.onrender.com/api"
export const API_BASE_URL = (() => {
  if (typeof window !== 'undefined' && window.__ENV__?.API_BASE_URL) {
    return window.__ENV__.API_BASE_URL;
  }
  if (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) {
    return process.env.VITE_API_BASE_URL;
  }
  return 'http://localhost:5000/api'; // local dev fallback
})();
