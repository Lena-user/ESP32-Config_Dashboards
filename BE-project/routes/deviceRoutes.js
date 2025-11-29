// routes/deviceRoutes.js
const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

// 1. Route quét WiFi (Đặt lên đầu để tránh nhầm với :id)
router.get('/scan-wifi', deviceController.scanWifiNetworks); 

// 2. Route tạo device
router.post('/thingsboard', deviceController.createDeviceOnThingsBoard);

// 3. Route xóa device
// router.delete('/thingsboard/:id', deviceController.deleteDevice);
router.delete('/:id', deviceController.deleteDevice); 
// ------------------------

// 4. Route lấy danh sách
router.get('/', deviceController.getAllDevices);

// 5. Route lấy chi tiết (Có tham số :id nên để xuống dưới)
router.get('/:id', deviceController.getDeviceDetail);

// 6. Route cập nhật cấu hình
router.post('/:id/config', deviceController.updateDeviceConfig);

// 7. Route lấy Telemetry (MỚI)
router.get('/:id/telemetry', deviceController.getDeviceTelemetry);

module.exports = router;