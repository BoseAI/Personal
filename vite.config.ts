import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-v2.svg', 'apple-touch-icon-v2.png'],
      manifest: {
        name: 'BoseIA',
        short_name: 'BoseIA',
        description: 'Finanze, spesa e allenamento',
        lang: 'it',
        start_url: '/',
        display: 'standalone',
        background_color: '#0b0b0c',
        theme_color: '#0b0b0c',
        icons: [
          { src: 'icon-v2-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-v2-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-v2-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // Le chiamate a Supabase non vanno mai in cache.
        navigateFallbackDenylist: [/^\/auth/, /^\/rest/],
      },
    }),
  ],
})
