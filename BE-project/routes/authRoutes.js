const express = require('express');
const router = express.Router();
// Chỉ lấy hàm login, bỏ register
const { login } = require('../controllers/authController');

// Xóa dòng router.post('/register', register); đi
router.post('/login', login);

module.exports = router;