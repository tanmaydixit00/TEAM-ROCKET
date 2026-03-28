// Load Firebase config from environment variables
// Fallback to defaults if not configured
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyAgfMgkTinrNo-yauAGyZDY7grTpmo8i2c",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "minicloud-6df35.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "minicloud-6df35",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "minicloud-6df35.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "953691126064",
  appId: process.env.FIREBASE_APP_ID || "1:953691126064:web:754a80c8abf23aa10e30f5"
};

module.exports = { firebaseConfig };
