// index.js
const express = require('express');
const db = require('./database.js'); // Import db (để đảm bảo kết nối được khởi tạo)
const deviceRoutes = require('./routes/deviceRoutes'); // Import routes của bro

const app = express();
const PORT = process.env.PORT || 3000; // Server sẽ chạy ở cổng 3000

// Middleware quan trọng:
// Giúp Express hiểu được dữ liệu JSON từ req.body
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// --- ĐỊNH NGHĨA ROUTES CHÍNH ---
// Bất kỳ request nào bắt đầu bằng "/api/devices"
// sẽ được chuyển cho `deviceRoutes` xử lý
app.use('/api/devices', deviceRoutes);

// Route cơ bản để kiểm tra server
app.get('/', (req, res) => {
  res.send('Server BE đang chạy ngon!');
});

// Khởi động server
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});