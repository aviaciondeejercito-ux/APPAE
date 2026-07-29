import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Sistema Aviación de Ejército',
        short_name: 'Sistema AE',
        description: 'Aplicación Operativa Offline-First de Aviación de Ejército',
        theme_color: '#1a202c',
        background_color: '#1a202c',
        display: 'standalone',
        icons: [
          {
            src: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png', // Ícono genérico temporal
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Almacena los archivos CSS, JS e HTML creados por Vite
        globPatterns: ['**/*.{js,css,html}']
      }
    })
  ]
});