import { defineConfig } from 'vite'

const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
]

const missing = requiredEnvVars.filter((key) => !process.env[key])
if (missing.length > 0) {
  console.warn(
    `[MiniCloud] WARNING: Missing environment variables:\n  ${missing.join('\n  ')}\n` +
    'Set them in your deployment platform or in frontend/.env before building.\n' +
    'See frontend/.env.example for the full list.'
  )
}

export default defineConfig({
  // Explicitly set output directory so Vercel and other deployment platforms
  // can locate the build artefacts without relying on defaults.
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
