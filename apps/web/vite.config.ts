import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5173,
    proxy: {
      // The Elysia API. Proxied so the browser sees one origin in dev.
      '/api': {
        target: process.env.SNOWLINE_API ?? 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
