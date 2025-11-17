const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'esp_dashboard.db');
const db = new Database(dbPath);

// Bật Foreign Key constraints cho SQLite
db.pragma('foreign_keys = ON');

// 1. Bảng DEVICES chính, đã bỏ telemetry và config
const createDevicesTable = `
  CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    status TEXT DEFAULT 'Offline',
    lastSeen TEXT
  );
`;

// 2. Bảng ATTRIBUTES (cho client attributes/config)
const createAttributesTable = `
  CREATE TABLE IF NOT EXISTS attributes (
    deviceId TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    PRIMARY KEY (deviceId, key),
    FOREIGN KEY (deviceId) REFERENCES devices(id) ON DELETE CASCADE
  );
`;

// 3. Bảng TELEMETRY (dữ liệu cảm biến theo thời gian)
const createTelemetryTable = `
  CREATE TABLE IF NOT EXISTS telemetry (
    deviceId TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    ts INTEGER NOT NULL, -- Lưu timestamp dạng Unix milliseconds
    PRIMARY KEY (deviceId, key, ts),
    FOREIGN KEY (deviceId) REFERENCES devices(id) ON DELETE CASCADE
  );
`;

// Thực thi các lệnh tạo bảng
db.exec(createDevicesTable);
db.exec(createAttributesTable);
db.exec(createTelemetryTable);

console.log('SQLite database with new schema (devices, attributes, telemetry) is ready.');

module.exports = db;