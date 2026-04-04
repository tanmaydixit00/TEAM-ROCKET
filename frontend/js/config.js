// ============================================================
//  Firebase & Supabase Configuration
//
//  Values are injected at build time by Vite from VITE_* environment
//  variables. Set them in a local .env file or in your Vercel project
//  settings. See .env.example for the required variable names.
// ============================================================
export const firebaseConfig = {
  apiKey:            __FIREBASE_API_KEY__,
  authDomain:        __FIREBASE_AUTH_DOMAIN__,
  projectId:         __FIREBASE_PROJECT_ID__,
  storageBucket:     __FIREBASE_STORAGE_BUCKET__,
  messagingSenderId: __FIREBASE_MESSAGING_SENDER_ID__,
  appId:             __FIREBASE_APP_ID__,
};

export const supabaseConfig = {
  url:     __SUPABASE_URL__,
  anonKey: __SUPABASE_ANON_KEY__,
};
