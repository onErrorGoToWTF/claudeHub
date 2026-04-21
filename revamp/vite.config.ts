import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Localhost-only for now. Old site remains the GH Pages deployment on main.
export default defineConfig({
  plugins: [react()],
  base: '/',
})
