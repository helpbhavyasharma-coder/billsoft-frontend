import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    // LAN se phone se test karne ke liye: http://<PC-IP>:5173
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost/BhaviSoft/billing-software/php-backend',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/uploads': {
        target: 'http://localhost/BhaviSoft/billing-software/php-backend',
        changeOrigin: true,
      },
    },
  },
})
