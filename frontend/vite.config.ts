import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// The dev server proxies /api to the ASP.NET backend, so the browser talks to a single origin.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:5080',
          changeOrigin: true,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 1600,
    },
  }
})
