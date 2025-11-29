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
    // Thêm 3 cột mới: wifi_ssid, wifi_password, frequency
    const sql = `
        CREATE TABLE IF NOT EXISTS devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            type TEXT,
            status TEXT DEFAULT 'offline',
            tb_device_id TEXT,
            tb_access_token TEXT,
            wifi_ssid TEXT,
            wifi_password TEXT,
            frequency INTEGER DEFAULT 10
        )
    `;
    
    db.run(sql, (err) => {
        if (err) {
            console.error("Lỗi tạo bảng:", err);
        } else {
            // console.log("Bảng devices đã sẵn sàng.");
        }
    });
}

module.exports = db;