// services/deviceService.js
const db = require('../database');

// 1. Lấy tất cả (ĐÃ SỬA: Hỗ trợ lọc theo ownerEmail)
const getAllDevices = (ownerEmail) => {
    return new Promise((resolve, reject) => {
        // Nếu có email -> Lọc theo email. Nếu không -> Lấy hết
        const sql = ownerEmail 
            ? "SELECT * FROM devices WHERE owner_email = ? ORDER BY id DESC"
            : "SELECT * FROM devices ORDER BY id DESC";
            
        const params = ownerEmail ? [ownerEmail] : [];

        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// 2. Tạo mới (SỬA CÂU SQL)
const createDeviceOnThingsBoard = (device) => {
    return new Promise((resolve, reject) => {
        const { name, type, tb_device_id, tb_access_token, owner_email } = device;
        
        // Thêm 'OR IGNORE' vào sau chữ INSERT
        const sql = `INSERT OR IGNORE INTO devices (name, type, status, tb_device_id, tb_access_token, owner_email) VALUES (?, ?, 'active', ?, ?, ?)`;
        
        db.run(sql, [name, type, tb_device_id, tb_access_token, owner_email], function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, ...device, status: 'active' });
        });
    });
};

// 3. Xóa thiết bị
const deleteDevice = (id) => {
    return new Promise((resolve, reject) => {
        const sql = "DELETE FROM devices WHERE id = ?"; 
        db.run(sql, [id], function(err) {
            if (err) reject(err);
            else resolve(this.changes > 0);
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

// 5. Cập nhật
const updateDeviceInfo = (id, data) => {
    return new Promise((resolve, reject) => {
        const fields = [];
        const values = [];

        if (data.wifi_ssid !== undefined) { fields.push("wifi_ssid = ?"); values.push(data.wifi_ssid); }
        if (data.wifi_password !== undefined) { fields.push("wifi_password = ?"); values.push(data.wifi_password); }
        if (data.frequency !== undefined) { fields.push("frequency = ?"); values.push(data.frequency); }
        if (data.alert_config !== undefined) { 
            fields.push("alert_config = ?"); 
            values.push(JSON.stringify(data.alert_config)); 
        }

        if (fields.length === 0) return resolve({ message: "Nothing to update" });

        values.push(id);
        const sql = `UPDATE devices SET ${fields.join(", ")} WHERE id = ?`;

        db.run(sql, values, function(err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
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