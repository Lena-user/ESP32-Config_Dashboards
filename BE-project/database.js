// database.js
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./esp_dashboard.db', (err) => {
  if (err) {
    console.error('Lỗi kết nối database:', err.message);
  } else {
    console.log('Đã kết nối tới database SQLite.');
    
    // Bảng 'devices' được cập nhật với các cột của ThingsBoard
    const sql = `
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT,
      label TEXT,
      tb_device_id TEXT NOT NULL UNIQUE, 
      tb_access_token TEXT
    )`;
    // tb_device_id: ID duy nhất từ ThingsBoard (cái UUID)
    // tb_access_token: Token bí mật của device (cái credentialsId)

    db.run(sql, (err) => {
      if (err) {
        console.error("Lỗi tạo bảng 'devices':", err.message);
      } else {
        console.log("Bảng 'devices' đã sẵn sàng (đã nâng cấp).");
      }
    });
  }
});

module.exports = db;