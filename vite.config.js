import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('pdfmake') || id.includes('qrcode')) return 'pdf';
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('react') || id.includes('axios')) return 'vendor';
          return 'vendor';
        },
      },
    },
  },
  server: {
    port: 5173,
    // LAN se phone se test karne ke liye: http://<PC-IP>:5173
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/auth/bhauu': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
