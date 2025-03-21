import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Determine if we're in a deployment environment
const isProduction = process.env.NODE_ENV === 'production'
const isDeployment = process.env.DO_APP_PLATFORM === 'true'

// Set output directory based on environment
// For DigitalOcean deployment, use the default 'dist' directory
// For local development, continue to use '../athlete_platform/staticfiles'
const outDir = isDeployment ? 'dist' : '../athlete_platform/staticfiles'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/admin': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    },
    // Enable history API fallback to support client-side routing
    historyApiFallback: {
      // Don't rewrite requests to /admin
      rewrites: [
        { 
          from: /^\/admin.*/, 
          to: context => context.parsedUrl.pathname 
        },
        { 
          from: /./, 
          to: '/index.html' 
        },
      ],
    },
  },
  // Configure build output path
  build: {
    outDir: outDir,
    emptyOutDir: true,
    // Generate manifest for Django to use
    manifest: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  }
})
