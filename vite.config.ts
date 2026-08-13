import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon-180.png'],
      manifest: {
        name: 'Mascota de Agua',
        short_name: 'Mascota Agua',
        description:
          'Tu mascota es tu cuerpo: se pone feliz cuando tomas agua y te dice de verdad como estas por dentro.',
        lang: 'es',
        dir: 'ltr',
        theme_color: '#04121f',
        background_color: '#04121f',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['health', 'lifestyle'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Se mete dentro del service worker: es lo que muestra los avisos de
        // la mascota aunque la app este cerrada.
        importScripts: ['/push-sw.js'],
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,webp,woff,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/__/, /^\/api/],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Firebase y React casi no cambian: en paquetes aparte se quedan en
        // cache del navegador entre versiones de la app.
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (/[\\/]node_modules[\\/]@?firebase[\\/]/.test(id)) return 'firebase'
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react'
          }
        },
      },
    },
  },
})
