import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'https://localhost:7239',
        changeOrigin: true,
        // Only the local development proxy accepts the ASP.NET dev certificate.
        secure: false,
      },
    },
  },
})
