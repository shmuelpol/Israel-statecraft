import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    watch: { usePolling: true, interval: 400 }, // native FS events are unreliable on some Windows setups
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: true },
      '/ws': { target: 'ws://localhost:8787', ws: true },
    },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
