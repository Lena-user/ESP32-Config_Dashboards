// routes/deviceRoutes.js
const express = require('express');
const router = express.Router();

// 1. Import controller
const deviceController = require('../controllers/deviceController');

// 2. Chỉ đăng ký route này
// URL sẽ là: POST /api/devices/thingsboard
router.post('/thingsboard', deviceController.createDeviceOnThingsBoard);


module.exports = router;