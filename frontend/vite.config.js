import { defineConfig } from 'vite'

// Environment variable validation is intentionally omitted here so that
// `vite build` succeeds even when variables are not present at build time.
// Runtime validation is handled in frontend/js/config.js using import.meta.env.

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
  },
})
