import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import svgr from 'vite-plugin-svgr';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    svgr(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'BBK Games',
        short_name: 'BBK',
        description: '经典 BBK RPG 模拟器',
        theme_color: '#1a1b18',
        background_color: '#050504',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2015',
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/v1': {
        target: 'http://localhost:1234',
        changeOrigin: true,
      },
    },
  },
});
