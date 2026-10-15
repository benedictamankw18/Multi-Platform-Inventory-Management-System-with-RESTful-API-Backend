import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths so the production build works when the packaged
  // Electron app loads the renderer over file:// (absolute "/assets/..." would
  // resolve to the filesystem root and yield a blank/black window).
  base: './',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8040',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8040',
        changeOrigin: true,
      },
    },
  },
})
