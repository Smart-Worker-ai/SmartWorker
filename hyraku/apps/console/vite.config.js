import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const root = path.resolve(process.cwd(), 'apps/console');

export default defineConfig({
  root,
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
    },
  },
  build: {
    outDir: path.join(root, 'dist'),
    emptyOutDir: true,
  },
});
