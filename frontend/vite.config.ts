import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    // Local dev proxies to the services directly; in Docker, Nginx does this.
    proxy: {
      '/api/research': {
        target: process.env.RESEARCH_SERVICE_URL || 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/research/, ''),
      },
      '/api/content': {
        target: process.env.CONTENT_SERVICE_URL || 'http://localhost:8002',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/content/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
});
