import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Для GitHub Pages замени base: '/' на '/имя-репо/'
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    proxy: {
      // Проксируем /apim/* → apim.moex.com/* (решает CORS при локальной разработке)
      // В коде используй APIM_BASE = '/apim' вместо 'https://apim.moex.com'
      '/apim': {
        target: 'https://apim.moex.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/apim/, ''),
      },
      // Проксируем /iss/* → iss.moex.com/*
      '/iss-proxy': {
        target: 'https://iss.moex.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/iss-proxy/, ''),
      },
    },
  },
});
