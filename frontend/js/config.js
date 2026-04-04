// ============================================================
//  Firebase & Supabase Configuration
//
//  Values are read at build time from VITE_* environment variables.
//  Set them in frontend/.env (see frontend/.env.example) or in
//  your deployment platform's environment settings.
// ============================================================

const missing = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
].filter((key) => !import.meta.env[key]);

if (missing.length > 0) {
  throw new Error(
    `[MiniCloud] Missing required environment variables:\n  ${missing.join('\n  ')}\n` +
    'Copy frontend/.env.example to frontend/.env and fill in your credentials.'
  );
}

export const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

export const supabaseConfig = {
  url:     import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
};
