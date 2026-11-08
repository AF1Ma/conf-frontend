import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const { API_PROXY_TARGET } = loadEnv(mode, '.', 'API_PROXY_')
  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: API_PROXY_TARGET || 'https://localhost:7239',
          changeOrigin: true,
          // The local development proxy accepts the ASP.NET dev certificate.
          secure: false,
        },
      },
    },
  }
})
