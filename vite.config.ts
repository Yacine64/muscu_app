/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Sur GitHub Pages, l'app est servie sous /<nom-du-depot>/.
// Le workflow GitHub Actions fournit ce chemin via la variable BASE_PATH.
// En local, on reste à la racine "/".
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  // Date de build affichée dans les Réglages : pratique pour vérifier
  // que le téléphone a bien reçu la dernière version.
  define: {
    __APP_VERSION__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Muscu – suivi d’entraînement',
        short_name: 'Muscu',
        description: 'Suivi personnel de musculation, hors ligne.',
        lang: 'fr',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,ico,json,webmanifest}'],
      },
    }),
  ],
  // Recharts alourdit le bundle ; tout est mis en cache hors ligne, donc pas de découpage nécessaire.
  build: { chunkSizeWarningLimit: 1200 },
  test: {
    environment: 'node',
  },
})
