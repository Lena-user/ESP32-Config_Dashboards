// services/deviceService.js
const db = require('../database');

// 1. Lấy tất cả
const getAllDevices = () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM devices ORDER BY id DESC", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// 2. Tạo mới
const createDeviceOnThingsBoard = (device) => {
    return new Promise((resolve, reject) => {
        const { name, type, tb_device_id, tb_access_token } = device;
        const sql = `INSERT INTO devices (name, type, status, tb_device_id, tb_access_token) VALUES (?, ?, 'active', ?, ?)`;
        
        db.run(sql, [name, type, tb_device_id, tb_access_token], function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, ...device, status: 'active' });
        });
    });
};

// 3. Xóa thiết bị (SỬA LẠI CHỖ NÀY QUAN TRỌNG NHẤT)
const deleteDevice = (id) => {
    return new Promise((resolve, reject) => {
        // Phải xóa theo cột 'id' (Primary Key) chứ không phải tb_device_id
        const sql = "DELETE FROM devices WHERE id = ?"; 
        
        db.run(sql, [id], function(err) {
            if (err) {
                reject(err);
            } else {
                // Kiểm tra xem có dòng nào bị xóa không
                if (this.changes > 0) {
                    console.log(`Service: Đã xóa thành công thiết bị ID ${id} khỏi Database`);
                    resolve(true);
                } else {
                    console.log(`Service: Không tìm thấy thiết bị ID ${id} để xóa`);
                    resolve(false);
                }
            }
        });
    });
};

// 4. Lấy theo ID
const getDeviceById = (id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM devices WHERE id = ?", [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

// 5. Cập nhật (Sửa để lưu thêm cấu hình Wifi/Frequency)
const updateDeviceInfo = (id, data) => {
    return new Promise((resolve, reject) => {
        // Lấy các trường dữ liệu, nếu không có thì giữ nguyên giá trị cũ (logic này nên xử lý kỹ hơn ở controller)
        // Ở đây tôi giả sử data gửi lên là đầy đủ hoặc update từng phần
        
        // Kiểm tra xem data có chứa thông tin config không để build câu SQL phù hợp
        const { wifi_ssid, wifi_password, frequency } = data;
        
        // Câu lệnh SQL update động (chỉ update những gì gửi lên)
        // Tuy nhiên để đơn giản cho demo, tôi sẽ update các trường config
        // Cần đảm bảo DB đã có cột: wifi_ssid, wifi_password, frequency
        
        const sql = `
            UPDATE devices 
            SET wifi_ssid = ?, 
                wifi_password = ?, 
                frequency = ? 
            WHERE id = ?
        `;

        db.run(sql, [wifi_ssid, wifi_password, frequency, id], function(err) {
            if (err) {
                // Nếu lỗi do thiếu cột, hãy báo cho người dùng biết
                if (err.message.includes("no such column")) {
                    console.error("Lỗi DB: Bảng devices thiếu cột wifi_ssid/password/frequency. Hãy xóa file database.sqlite để tạo lại.");
                }
                reject(err);
            } else {
                resolve({ id, ...data });
            }
        });
    });
};

module.exports = {
    getAllDevices,
    createDeviceOnThingsBoard,
    deleteDevice,
    getDeviceById,
    updateDeviceInfo
};