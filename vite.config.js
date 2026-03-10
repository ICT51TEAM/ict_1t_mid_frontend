import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://100.91.129.24:8080',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://100.91.129.24:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/uploads/, '/api/uploads'),
      },
    },
  },
});
