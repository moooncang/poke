import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.PAGES_BASE_PATH || '/',
  plugins: [react()],
  server: { port: 5173 },
  build: { rollupOptions: { output: { manualChunks(id) {
    if (id.includes('node_modules')) return 'vendor';
    if (id.endsWith('/pokemon.json')) return 'pokedex';
  } } } },
});
