// ============================================================
//  Backend Configuration — EXAMPLE / TEMPLATE
//
//  HOW TO USE:
//  1. Copy .env.example to .env
//       cp backend/.env.example backend/.env
//  2. Fill in your real values in .env
//  3. This config.js reads from environment variables
//  4. Never commit .env to version control (use .gitignore)
//
//  WHERE TO FIND THESE VALUES:
//  Firebase Console → Project Settings → General
//  → "Your apps" → Web app → Config snippet
// ============================================================

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID",
};
