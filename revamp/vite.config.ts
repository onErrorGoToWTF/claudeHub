import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

function readGitCommit(): string {
  try {
    const sha = execSync('git rev-parse HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
    return sha.slice(0, 7) || 'dev-local'
  } catch {
    return 'dev-local'
  }
}

// GitHub Pages serves from /claudeHub/ in production. Localhost stays at /.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/claudeHub/' : '/',
  define: {
    // Build-time commit hash for the /labs/atom-* HUD. Falls back to
    // "dev-local" if `git` isn't on PATH (e.g. some CI sandboxes).
    'import.meta.env.VITE_GIT_COMMIT': JSON.stringify(readGitCommit()),
  },
}))
