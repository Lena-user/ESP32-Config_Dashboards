import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Cổng của Frontend (giữ nguyên)
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // <--- SỬA THÀNH 3000 CHO KHỚP VỚI BACKEND
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
