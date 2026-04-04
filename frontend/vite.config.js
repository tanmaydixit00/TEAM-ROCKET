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
  throw new Error(`Missing required environment variables:\n  ${missing.join('\n  ')}\nSee frontend/.env.example for the full list.`)
}

export default defineConfig({})
