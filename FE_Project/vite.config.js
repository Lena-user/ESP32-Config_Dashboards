import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Chuỗi '/api' là tiền tố bạn sẽ sử dụng trong các yêu cầu fetch
      '/api': {
        target: 'http://localhost:3001', // Địa chỉ backend server của bạn
        changeOrigin: true, // Cần thiết cho virtual hosted sites
        secure: false,      // Nếu backend server không dùng https
      }
    }
  }
})
