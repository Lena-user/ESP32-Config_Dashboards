// index.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const deviceRoutes = require('./routes/deviceRoutes');
const authController = require('./controllers/authController'); // Import controller

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// --- QUAN TRỌNG: Đăng ký đường dẫn gốc ---
app.use('/api/devices', deviceRoutes); 
// -----------------------------------------

// Routes API
app.use('/api/devices', deviceRoutes);

// Thêm Routes Auth trực tiếp tại đây cho nhanh
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});