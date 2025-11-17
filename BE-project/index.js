// filepath: c:\Users\Admin\Documents\ESP32-Config_Dashboards\BE-project\index.js
const express = require('express');
const cors = require('cors'); // <-- 1. Thêm dòng này
const deviceRoutes = require('./routes/deviceRoutes');

const app = express();
const PORT = 3001;

app.use(cors()); // <-- 2. Thêm dòng này để cho phép tất cả các yêu cầu
app.use(express.json());

app.use('/api/devices', deviceRoutes);

app.listen(PORT, () => {
  console.log(`Backend server đang chạy tại http://localhost:${PORT}`);
});