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
      // ── 사진 관련 API → 원격 서버 (100.91.129.24) ──
      '/api/photos': {
        target: 'http://100.91.129.24:8080',
        changeOrigin: true,
      },
      '/api/albums': {
        target: 'http://100.91.129.24:8080',
        changeOrigin: true,
      },
      '/api/users/me/profile-image': {
        target: 'http://100.91.129.24:8080',
        changeOrigin: true,
      },
      // ── 사진 정적 파일 → 원격 서버 ──
      '/uploads': {
        target: 'http://100.91.129.24:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/uploads/, '/api/uploads'),
      },
      // ── 나머지 API → 로컬 백엔드 ──
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
