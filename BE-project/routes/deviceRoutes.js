const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

// GET /api/devices -> Lấy tất cả thiết bị
router.get('/', deviceController.getAllDevices);

// POST /api/devices -> Tạo thiết bị mới
router.post('/', deviceController.createDevice);

// GET /api/devices/:id -> Lấy chi tiết thiết bị (attributes)
router.get('/:id', deviceController.getDeviceById);

// DELETE /api/devices/:id -> Xóa thiết bị
router.delete('/:id', deviceController.deleteDevice);

// GET /api/devices/:id/telemetry -> Lấy dữ liệu telemetry
router.get('/:id/telemetry', deviceController.getDeviceTelemetry);

// POST /api/devices/:id/config -> Cập nhật cấu hình
router.post('/:id/config', deviceController.updateDeviceConfig);

module.exports = router;