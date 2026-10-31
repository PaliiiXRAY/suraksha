import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: true,
        type: 'module',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,webmanifest}'],
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.pmtiles') || url.pathname.includes('/tiles/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'pmtiles-cache',
              rangeRequests: true,
              cacheableResponse: {
                statuses: [0, 200, 206],
              },
            },
          },
        ],
      },
      manifest: {
        name: 'MeshMap — Offline Citizen Disaster Map',
        short_name: 'MeshMap',
        description: 'Decentralized, offline-first citizen disaster map with peer-to-peer sync.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: '/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
    fs: {
      allow: ['..'],
    },
  },
});

