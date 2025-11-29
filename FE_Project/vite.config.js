import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Chuỗi '/api' là tiền tố bạn sẽ sử dụng trong các yêu cầu fetch
      '/api': {
        target: 'http://localhost:3000', // <--- SỬA TỪ 3001 THÀNH 3000
        changeOrigin: true, 
        secure: false,      
      }
    }
  }
})
