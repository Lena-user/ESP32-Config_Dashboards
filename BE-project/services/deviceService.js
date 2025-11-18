// services/deviceService.js
const db = require('../database.js');
const axios = require('axios');
const tbConfig = require('../thingboardsConfig.js');

// Chuẩn bị URL và Token (dùng chung)
const TB_API_URL = tbConfig.url;
const TB_ADMIN_TOKEN = tbConfig.token;
const ADMIN_HEADERS = {
  'Content-Type': 'application/json',
  'X-Authorization': `Bearer ${TB_ADMIN_TOKEN}`
};


const deviceService = {

  /**
   * HÀM MỚI: Lấy Credentials (Access Token) của một Device
   * (Hàm này chỉ để nội bộ service này gọi)
   */
  getDeviceCredentials: async (tbDeviceId) => {
    const API_URL = `${TB_API_URL}/api/device/${tbDeviceId}/credentials`;
    console.log(`Đang gọi API Lấy Token: ${API_URL}`);

    try {
      const response = await axios.get(API_URL, { headers: ADMIN_HEADERS });
      // Access Token nằm trong trường 'credentialsId'
      return response.data.credentialsId; 
    } catch (error) {
      console.error('Lỗi khi lấy credentials:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Không thể lấy credentials của device');
    }
  },


  /**
   * HÀM ĐÃ SỬA: Tạo device, lấy token, và LƯU VÀO DB
   */
  createDeviceOnThingsBoard: async (deviceData) => {
    const { name, type, label } = deviceData;

    // --- BƯỚC 1: Gọi API ThingsBoard để TẠO DEVICE ---
    const CREATE_API_URL = `${TB_API_URL}/api/device`;
    const payload = {
      name: name,
      type: type || 'default',
      label: label || ''
    };
    
    console.log(`Đang gọi API Tạo Device: ${CREATE_API_URL}`);
    
    let tbDevice;
    try {
      const tbDeviceResponse = await axios.post(CREATE_API_URL, payload, { headers: ADMIN_HEADERS });
      tbDevice = tbDeviceResponse.data;
    } catch (error) {
       console.error('LÔI KHI TAO DEVICE TREN TB:', error.response?.data || error.message);
       throw new Error(error.response?.data?.message || 'Không thể tạo thiết bị trên ThingsBoard');
    }

    
    // --- BƯỚC 2: Lấy ID của device vừa tạo ---
    const tbDeviceId = tbDevice.id.id;
    if (!tbDeviceId) {
      throw new Error('Không lấy được device ID từ ThingsBoard');
    }
    console.log(`Tạo device TB thành công, ID: ${tbDeviceId}`);

    // --- BƯỚC 3: Gọi HÀM MỚI (ở trên) để LẤY ACCESS TOKEN ---
    // Dùng 'this.' để gọi hàm khác trong cùng object
    const tbAccessToken = await deviceService.getDeviceCredentials(tbDeviceId);
    console.log(`Lấy Access Token thành công: ${tbAccessToken}`);

    // --- BƯỚC 4: LƯU TẤT CẢ vào database SQLite CỦA BRO ---
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO devices (name, type, label, tb_device_id, tb_access_token) 
                   VALUES (?, ?, ?, ?, ?)`;
      const params = [
        tbDevice.name,
        tbDevice.type,
        tbDevice.label,
        tbDeviceId,
        tbAccessToken
      ];

      db.run(sql, params, function (err) {
        if (err) {
          console.error('Lỗi lưu device vào SQLite:', err.message);
          reject(err);
        } else {
          // --- BƯỚC 5: Trả về dữ liệu đã được lưu (kèm token) ---
          const newLocalDevice = {
            id: this.lastID, // ID từ SQLite
            name: tbDevice.name,
            type: tbDevice.type,
            label: tbDevice.label,
            tb_device_id: tbDeviceId,
            tb_access_token: tbAccessToken // <--- NGON!
          };
          console.log('Đã lưu device vào DB nội bộ:', newLocalDevice);
          resolve(newLocalDevice);
        }
      });
    });
  }
};

module.exports = deviceService;