// ============================================================
//  Firebase & Supabase Configuration
//
//  Values are read at build time from VITE_* environment variables.
//  Set them in frontend/.env (see frontend/.env.example) or in
//  your deployment platform's environment settings (e.g. Vercel →
//  Project Settings → Environment Variables) BEFORE deploying.
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
    'These must be set BEFORE building. Copy frontend/.env.example to frontend/.env\n' +
    'and fill in your credentials, or add them to your deployment platform\'s\n' +
    'Environment Variables settings (e.g. Vercel → Project Settings → Environment Variables).'
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
