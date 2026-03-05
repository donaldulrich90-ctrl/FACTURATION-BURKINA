import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      pwaAssets: {
        image: 'public/icon.svg',
        overrideManifestIcons: true
      },
      manifest: {
        name: 'Burkina Marchés Pro',
        short_name: 'Burkina Marchés Pro',
        description: 'Plateforme de Marchés Publics - Burkina Faso',
        theme_color: '#0F1C2E',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        lang: 'fr'
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
        proxyTimeout: 600000,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            // Réponse propre quand l'API est indisponible (redémarrage --watch, crash)
            if (res && !res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'API indisponible. Lancez: cd server && npm run dev' }));
            }
          });
        },
      },
      '/socket.io': {
        target: 'http://127.0.0.1:3001',
        ws: true,
      },
    },
  },
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
});
