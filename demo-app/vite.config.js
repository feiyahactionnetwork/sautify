import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Stop Vite walking up to the marketing site's Tailwind PostCSS config
  css: { postcss: { plugins: [] } },
  server: {
    port: 5175,
    host: true, // expose on the LAN so a phone on the same Wi-Fi can open the demo
    proxy: {
      '/api': {
        target: 'http://localhost:5177',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
})
