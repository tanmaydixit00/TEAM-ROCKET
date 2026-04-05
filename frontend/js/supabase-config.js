// ============================================================
//  Supabase Configuration
//
//  Priority order for value resolution:
//    1. window.__ENV__  — injected at deploy time
//    2. process.env.*  — available in bundler environments
//    3. Hardcoded defaults — replace with your own project values
// ============================================================

function env(key, fallback = '') {
  if (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__[key]) {
    return window.__ENV__[key];
  }
  if (typeof process !== 'undefined' && process.env) {
    const viteKey = `VITE_SUPABASE_${key}` in process.env
      ? `VITE_SUPABASE_${key}`
      : `VITE_${key}` in process.env
        ? `VITE_${key}`
        : null;
    if (viteKey && process.env[viteKey]) return process.env[viteKey];
  }
  return fallback;
}

export const supabaseConfig = {
  url:    env('URL',    'https://rmqaewrkwjviifozveow.supabase.co'),
  key:    env('KEY',    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcWFld3Jrd2p2aWlmb3p2ZW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3ODc1OTMsImV4cCI6MjA4NTM2MzU5M30.6f97ePKGnr8wk7OWFOGla5Fo4u68ruNdITy8udBqTJA'),
  bucket: env('BUCKET', 'files'),
};
