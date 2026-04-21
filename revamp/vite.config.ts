import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves from /claudeHub/ in production. Localhost stays at /.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/claudeHub/' : '/',
}))
