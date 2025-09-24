// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // AÑADE ESTA SECCIÓN AQUÍ
  server: {
    allowedHosts: ['e13a8764e0ba.ngrok-free.app'] 
  }
})