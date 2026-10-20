import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Same-origin calls in dev; override the target with API_PROXY_TARGET if the API runs elsewhere.
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:5044', // Replace with your backend URL
        changeOrigin: true,             // Changes the origin header to match the target
        secure: false,                  // Set to false if using self-signed HTTPS certificates
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
