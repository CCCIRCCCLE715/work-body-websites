import { defineConfig } from 'vite';
export default defineConfig({
  cacheDir: './.vite-cache',
  build: { target: 'es2022', chunkSizeWarningLimit: 900, rollupOptions: { input: 'index.html' } },
});
