import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:7071',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.warn(
              '[vite-proxy] API unreachable — is Azure Functions running on port 7071?',
              err.message
            );
          });
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            console.log('[vite-proxy]', req.method, req.url, '→ localhost:7071');
          });
        },
      },
    },
  },
})