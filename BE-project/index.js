// index.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const deviceRoutes = require('./routes/deviceRoutes'); // Import routes

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// --- QUAN TRỌNG: Đăng ký đường dẫn gốc ---
app.use('/api/devices', deviceRoutes); 
// -----------------------------------------

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});