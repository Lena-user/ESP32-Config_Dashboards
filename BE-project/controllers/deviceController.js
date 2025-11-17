const deviceService = require('../services/deviceService');

// Lấy tất cả thiết bị
exports.getAllDevices = (req, res) => {
    res.json(deviceService.getAll());
};

// Lấy thiết bị theo ID (bao gồm attributes/config)
exports.getDeviceById = (req, res) => {
    const device = deviceService.getById(req.params.id);
    if (device) {
        res.json(device);
    } else {
        res.status(404).json({ message: 'Device not found' });
    }
};

// Lấy Telemetry của thiết bị
exports.getDeviceTelemetry = (req, res) => {
    const device = deviceService.getById(req.params.id);
    if (device && device.telemetry) {
        res.json(device.telemetry);
    } else {
        res.status(404).json({ message: 'Telemetry not found for this device' });
    }
};

// Tạo thiết bị mới
exports.createDevice = (req, res) => {
    const newDevice = deviceService.create(req.body);
    res.status(201).json(newDevice);
};

// Xóa thiết bị
exports.deleteDevice = (req, res) => {
    deviceService.remove(req.params.id);
    res.status(204).send(); // 204 No Content
};

// Cập nhật config (giữ lại từ trước)
exports.updateDeviceConfig = (req, res) => {
    const updatedDevice = deviceService.updateConfig(req.params.id, req.body);
    if (updatedDevice) {
        res.json({ message: 'Lưu cấu hình thành công!', device: updatedDevice });
    } else {
        res.status(404).json({ message: 'Device not found' });
    }
};