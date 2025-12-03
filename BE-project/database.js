// database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Lỗi kết nối Database:', err.message);
    } else {
        console.log('Đã kết nối tới SQLite Database.');
        initDb();
    }
});

function initDb() {
    // Thêm cột owner_email
    const sql = `
        CREATE TABLE IF NOT EXISTS devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT,
            status TEXT DEFAULT 'offline',
            tb_device_id TEXT UNIQUE,  -- THÊM CHỮ 'UNIQUE' VÀO ĐÂY
            tb_access_token TEXT,
            wifi_ssid TEXT,
            wifi_password TEXT,
            frequency INTEGER DEFAULT 10,
            alert_config TEXT,
            owner_email TEXT
        )
    `;
    
    db.run(sql, (err) => {
        if (err) {
            console.error("Lỗi tạo bảng:", err);
        } else {
            // console.log("Bảng devices đã sẵn sàng.");
        }
    });

    // --- SỬA BẢNG USERS: THÊM CỘT NAME ---
    const sqlUsers = `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            password TEXT,
            name TEXT  -- <--- QUAN TRỌNG: Phải có cột này code mới chạy được
        )
    `;

    db.run(sqlUsers, (err) => {
        if (err) {
            console.error("Lỗi tạo bảng users:", err);
        } else {
            console.log("Bảng users đã sẵn sàng.");
        }
    });
}

module.exports = db;