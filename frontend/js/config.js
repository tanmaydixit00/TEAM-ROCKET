// ============================================================
//  Firebase Configuration
//
//  Loads from environment variables (Vercel, build-time, etc.)
//  Falls back to hardcoded defaults for local development.
//  Firebase credentials are public and restricted by Security
//  Rules (Firestore/Storage), not by keeping them secret.
// ============================================================

function getFirebaseConfig() {
  // Try environment variables first (build-time or runtime injection)
  const fromEnv = {
    apiKey:            process.env.REACT_APP_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
    authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
    projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
    storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId:             process.env.REACT_APP_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
  };

  // Check if all env vars are provided
  if (fromEnv.apiKey && fromEnv.authDomain && fromEnv.projectId) {
    return fromEnv;
  }

  // Fallback to hardcoded defaults for development
  return {
    apiKey:            "AIzaSyAgfMgkTinrNo-yauAGyZDY7grTpmo8i2c",
    authDomain:        "minicloud-6df35.firebaseapp.com",
    projectId:         "minicloud-6df35",
    storageBucket:     "minicloud-6df35.firebasestorage.app",
    messagingSenderId: "953691126064",
    appId:             "1:953691126064:web:754a80c8abf23aa10e30f5"
  };
}

export const firebaseConfig = getFirebaseConfig();
