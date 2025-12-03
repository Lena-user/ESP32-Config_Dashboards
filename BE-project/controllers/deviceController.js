const db = require('../database');
const axios = require('axios');
const deviceService = require('../services/deviceService');
const { TB_SERVER_URL: RAW_TB_URL } = require('../thingboardsConfig');

// Xử lý URL sạch sẽ ngay từ đầu
const TB_SERVER_URL = RAW_TB_URL.replace(/\/+$/, '');

// --- HÀM PHỤ TRỢ: LẤY TOKEN TỪ HEADER ---
const resolveTbToken = async (req) => {
    const userTbToken = req.headers['x-tb-token'];
    if (userTbToken && userTbToken !== 'null' && userTbToken !== 'undefined') {
        return userTbToken;
    }
    return null;
};

// --- HÀM MỚI: LẤY CREDENTIALS (ACCESS TOKEN) CỦA THIẾT BỊ ---
const getDeviceCredentials = async (deviceId, jwtToken) => {
    try {
        console.log(`>> [DEBUG] Đang lấy Token cho Device ID: ${deviceId}`);
        const response = await axios.get(
            `${TB_SERVER_URL}/api/device/${deviceId}/credentials`,
            { headers: { 'X-Authorization': `Bearer ${jwtToken}` } }
        );
        // credentialsId chính là Access Token dùng để gửi MQTT/HTTP
        const token = response.data.credentialsId;
        console.log(`>> [DEBUG] => Tìm thấy Token: ${token}`);
        return token;
    } catch (error) {
        console.error(`>> [LỖI] Không lấy được Token thiết bị: ${error.message}`);
        return 'N/A';
    }
};

// --- 1. QUÉT WIFI (Giữ nguyên) ---
const scanWifiNetworks = (req, res) => {
    // ... (Code cũ giữ nguyên, hoặc để trống nếu chưa dùng)
    res.json({ networks: [] });
};

// --- 2. LẤY DANH SÁCH THIẾT BỊ TỪ DB LOCAL ---
const getAllDevices = (req, res) => {
    const userEmail = req.headers['x-user-email'];
    let sql = "SELECT * FROM devices";
    let params = [];

    if (userEmail) {
        sql += " WHERE owner_email = ?";
        params.push(userEmail);
    }

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

// --- 3. TẠO THIẾT BỊ MỚI (Giữ nguyên logic cơ bản) ---
const createDeviceOnThingsBoard = async (req, res) => {
    // ... (Logic tạo thiết bị thủ công - nếu bạn cần sửa thì báo sau)
    res.status(501).json({message: "Chức năng đang cập nhật"});
};

// --- 4. XÓA THIẾT BỊ ---
const deleteDevice = async (req, res) => {
    const { id } = req.params;
    const jwtToken = await resolveTbToken(req);

    db.get("SELECT * FROM devices WHERE id = ?", [id], async (err, device) => {
        if (!device) return res.status(404).json({ error: "Không tìm thấy thiết bị" });

        // Xóa trên ThingsBoard nếu có Token
        if (jwtToken && device.tb_device_id) {
            try {
                await axios.delete(`${TB_SERVER_URL}/api/device/${device.tb_device_id}`, {
                    headers: { 'X-Authorization': `Bearer ${jwtToken}` }
                });
                console.log(">> Đã xóa trên ThingsBoard");
            } catch (e) {
                console.error(">> Lỗi xóa trên TB:", e.message);
            }
        }

        // Xóa Local
        db.run("DELETE FROM devices WHERE id = ?", [id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Đã xóa thiết bị thành công" });
        });
    });
};

// --- 5. CHI TIẾT THIẾT BỊ ---
const getDeviceDetail = (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM devices WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Device not found" });
        res.json(row);
    });
};

// --- 6. CẬP NHẬT CẤU HÌNH ---
const updateDeviceConfig = (req, res) => {
    // ... (Logic update config)
    res.json({ success: true });
};

// --- 7. TELEMETRY (ĐÃ SỬA: TỰ ĐỘNG LẤY MỌI LOẠI DỮ LIỆU) ---
const getDeviceTelemetry = async (req, res) => {
    const { id } = req.params;
    const jwtToken = await resolveTbToken(req);

    if (!jwtToken) return res.json({}); 

    db.get("SELECT tb_device_id FROM devices WHERE id = ?", [id], async (err, device) => {
        if (err || !device || !device.tb_device_id) return res.json({});

        try {
            // BƯỚC 1: Hỏi xem thiết bị có những Key nào (VD: voltage, current, co2...)
            const keysUrl = `${TB_SERVER_URL}/api/plugins/telemetry/DEVICE/${device.tb_device_id}/keys/timeseries`;
            const keysResponse = await axios.get(keysUrl, {
                headers: { 'X-Authorization': `Bearer ${jwtToken}` }
            });

            const keys = keysResponse.data; // Kết quả VD: ['temperature', 'humidity', 'voltage']

            // Nếu thiết bị mới tinh chưa gửi gì lên -> Trả về rỗng
            if (!keys || keys.length === 0) {
                return res.json({});
            }

            // BƯỚC 2: Lấy dữ liệu của TẤT CẢ các Key tìm được
            const valuesUrl = `${TB_SERVER_URL}/api/plugins/telemetry/DEVICE/${device.tb_device_id}/values/timeseries?keys=${keys.join(',')}`;
            
            const response = await axios.get(valuesUrl, {
                headers: { 'X-Authorization': `Bearer ${jwtToken}` }
            });

            const tbData = response.data;
            const result = {};

            // Làm sạch dữ liệu
            Object.keys(tbData).forEach(key => {
                if (tbData[key] && tbData[key].length > 0) {
                    let val = tbData[key][0].value;
                    // Cố gắng chuyển sang số, nếu không được thì giữ nguyên là chuỗi (VD: "ON", "OFF")
                    if (!isNaN(val) && val !== '' && val !== null) {
                        val = parseFloat(val);
                        // Làm tròn 2 chữ số thập phân cho đẹp
                        if (!Number.isInteger(val)) val = parseFloat(val.toFixed(2));
                    }
                    result[key] = val;
                }
            });

            console.log(`>> Telemetry Device ${id}:`, result);
            res.json(result);

        } catch (error) {
            console.error(`>> Lỗi lấy Telemetry (ID: ${id}):`, error.message);
            res.json({});
        }
    });
};

// --- 8. ĐỒNG BỘ THIẾT BỊ (QUAN TRỌNG: ĐÃ SỬA LOGIC LẤY TOKEN) ---
const syncDevices = async (req, res) => {
    console.log("\n>> --- BẮT ĐẦU QUY TRÌNH ĐỒNG BỘ ---");
    
    const ownerEmail = req.headers['x-user-email']; 
    const jwtToken = await resolveTbToken(req);

    if (!jwtToken) {
        return res.status(401).json({ error: "Thiếu Token ThingsBoard. Vui lòng đăng nhập lại." });
    }

    try {
        let tbDevices = [];
        console.log(">> [BƯỚC 1] Đang tải danh sách thiết bị từ ThingsBoard...");

        // Thử lấy Tenant Devices
        try {
            const response = await axios.get(
                `${TB_SERVER_URL}/api/tenant/devices?pageSize=100&page=0`,
                { headers: { 'X-Authorization': `Bearer ${jwtToken}` } }
            );
            tbDevices = response.data.data;
        } catch (err) {
            // Nếu lỗi, thử lấy User Devices
            try {
                const userResponse = await axios.get(
                    `${TB_SERVER_URL}/api/user/devices?pageSize=100&page=0`, 
                    { headers: { 'X-Authorization': `Bearer ${jwtToken}` } }
                );
                tbDevices = userResponse.data.data;
            } catch (e) { 
                console.error(">> [LỖI] Không lấy được danh sách:", e.message);
                return res.status(401).json({ error: "Lỗi kết nối ThingsBoard" });
            }
        }

        if (!tbDevices || tbDevices.length === 0) {
            console.log(">> [KẾT QUẢ] Không có thiết bị nào trên Cloud.");
            return res.json({ message: "Không tìm thấy thiết bị." });
        }

        console.log(`>> [BƯỚC 2] Tìm thấy ${tbDevices.length} thiết bị. Bắt đầu xử lý từng cái...`);

        let count = 0;
        let updated = 0;

        for (const tbDev of tbDevices) {
            // Kiểm tra xem thiết bị đã có trong DB chưa
            const existing = await new Promise(resolve => {
                db.get("SELECT * FROM devices WHERE tb_device_id = ?", [tbDev.id.id], (err, row) => resolve(row));
            });

            // --- ĐOẠN MỚI: LUÔN LUÔN LẤY TOKEN MỚI NHẤT ---
            const deviceAccessToken = await getDeviceCredentials(tbDev.id.id, jwtToken);
            // -----------------------------------------------

            if (!existing) {
                // Nếu chưa có -> Tạo mới
                console.log(`>> [NEW] Thêm mới: ${tbDev.name} | Token: ${deviceAccessToken}`);
                await deviceService.createDeviceOnThingsBoard({
                    name: tbDev.name,
                    type: tbDev.type,
                    tb_device_id: tbDev.id.id,
                    tb_access_token: deviceAccessToken, // Lưu Token thật vào đây
                    owner_email: ownerEmail 
                });
                count++;
            } else {
                // Nếu đã có -> Cập nhật lại Token (đề phòng Token bị đổi)
                if (existing.tb_access_token !== deviceAccessToken && deviceAccessToken !== 'N/A') {
                    console.log(`>> [UPDATE] Cập nhật Token cho: ${tbDev.name}`);
                    db.run("UPDATE devices SET tb_access_token = ? WHERE id = ?", [deviceAccessToken, existing.id]);
                    updated++;
                }
            }
        }
        
        console.log(`>> [HOÀN TẤT] Thêm mới: ${count}, Cập nhật: ${updated}`);
        res.json({ success: true, message: `Đồng bộ xong. Thêm ${count}, Cập nhật ${updated}.` });

    } catch (error) {
        console.error(">> [CRITICAL ERROR]:", error.message);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    scanWifiNetworks, getAllDevices, createDeviceOnThingsBoard, deleteDevice,
    getDeviceDetail, updateDeviceConfig, getDeviceTelemetry, syncDevices
};