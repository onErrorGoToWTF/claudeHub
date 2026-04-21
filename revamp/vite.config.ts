import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// For GitHub Pages: served under /claudeHub/revamp/ when Pages points here,
// or /claudeHub/ when promoted. Override via VITE_BASE if deployed elsewhere.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: process.env.VITE_BASE ?? (mode === 'production' ? '/claudeHub/revamp/' : '/'),
}))
