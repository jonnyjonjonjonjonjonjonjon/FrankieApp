import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Served from GitHub Pages under the repository name.
const BASE = '/FrankieApp/'

// Version shown in the app: <major.minor from package.json>.<number of commits>,
// so it goes up automatically with every publish.
function appVersion(): string {
  const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }
  const [major, minor] = pkg.version.split('.')
  let build = '0'
  try {
    build = execSync('git rev-list --count HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    // not a git checkout
  }
  return `${major}.${minor}.${build}`
}

export default defineConfig({
  base: BASE,
  define: {
    __APP_VERSION__: JSON.stringify(appVersion()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: "Frankie's Diary",
        short_name: 'Diary',
        description: 'A shared visual diary and calendar for Frankie',
        theme_color: '#f26f21',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        scope: BASE,
        start_url: BASE,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        // The symbol comparison page is a separate static page, not part of the app.
        globIgnores: ['symbols/**'],
        navigateFallbackDenylist: [/\/symbols\//],
      },
    }),
  ],
})
