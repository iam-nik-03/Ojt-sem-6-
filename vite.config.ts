import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY),
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: process.env.DISABLE_HMR === 'true' ? false : {
      // If not disabled, configure for proxied HTTPS environments
      // This allows HMR to work through the cloud proxy if needed
      protocol: process.env.NODE_ENV === 'production' ? 'wss' : 'ws',
      clientPort: process.env.NODE_ENV === 'production' ? 443 : 3000,
    }
  }
})
