import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',  // Default to localhost if env var not set
        changeOrigin: true,
        secure: false,
      }
    },
    // Enable history API fallback to support client-side routing
    historyApiFallback: true,
  },
  // Configure build output path if needed
  build: {
    outDir: '../athlete_platform/staticfiles',
    emptyOutDir: true,
    // Generate manifest for Django to use
    manifest: true,
  }
})
