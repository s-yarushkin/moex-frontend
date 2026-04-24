import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    base: env.VITE_BASE_PATH || '/',
    server: {
      proxy: {
        '/apim': {
          target: 'https://apim.moex.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/apim/, ''),
        },
        '/iss-proxy': {
          target: 'https://iss.moex.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/iss-proxy/, ''),
        },
      },
    },
  };
});
