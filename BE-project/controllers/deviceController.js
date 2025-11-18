// controllers/deviceController.js
const deviceService = require('../services/deviceService');

// Khởi tạo object controller
const deviceController = {};

/**
 * Xử lý request POST /api/devices/thingsboard
 */
deviceController.createDeviceOnThingsBoard = async (req, res) => {
  try {
    // Lấy dữ liệu từ body của request
    const { name, type, label } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Thiếu `name`' });
    }

    const deviceData = { name, type, label };
    
    // Gọi service để tạo device trên ThingsBoard
    const newLocalDevice = await deviceService.createDeviceOnThingsBoard(deviceData);

    // Trả về kết quả mà Service vừa trả (đã có token)
    res.status(201).json({
      message: 'Tạo thiết bị và lưu vào DB thành công',
      data: newLocalDevice
    });

  } catch (error) {
    res.status(500).json({
      message: 'Có lỗi xảy ra',
      error: error.message
    });
  }
};


// Đảm bảo module.exports PHẢI nằm ở cuối file
module.exports = deviceController;