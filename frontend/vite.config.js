import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        name: 'Merenda — Carteira Digital Escolar',
        short_name: 'Merenda',
        description: 'Carteira digital para alunos, pais e cantinas escolares.',
        theme_color: '#f97316',
        background_color: '#0f172a',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        lang: 'pt-BR',
        icons: [
          { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
        shortcuts: [
          { name: 'Pagar', short_name: 'QR', url: '/estudante' },
          { name: 'PDV', short_name: 'PDV', url: '/cantina/pdv' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp}'],
        // não tenta cachear streams SSE nem chamadas autenticadas mutáveis
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/produtos') || url.pathname.startsWith('/api/cantinas'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'merenda-catalogo', expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 } },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
