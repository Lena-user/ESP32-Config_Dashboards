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

    // THÊM BẢNG USERS
    const sqlUsers = `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            password TEXT
        )
    `;

    db.run(sqlUsers, (err) => {
        if (err) {
            console.error("Lỗi tạo bảng users:", err);
        } else {
            // --- TẠO TÀI KHOẢN MẶC ĐỊNH (SEEDING) ---
            const checkSql = "SELECT count(*) as count FROM users";
            db.get(checkSql, [], (err, row) => {
                if (row && row.count === 0) {
                    const insertAdmin = "INSERT INTO users (email, password) VALUES (?, ?)";
                    // Tài khoản: admin@iot.com / Mật khẩu: 123456
                    db.run(insertAdmin, ["admin@iot.com", "123456"], (err) => {
                        if (!err) console.log("--> Đã tạo tài khoản mặc định: admin@iot.com / 123456");
                    });
                }
            });
        }
    });
}

module.exports = db;