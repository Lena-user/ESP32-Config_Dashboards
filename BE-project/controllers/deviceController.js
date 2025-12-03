const wifi = require('node-wifi');
const axios = require('axios');
const { TB_SERVER_URL, TB_USER, TB_PASSWORD } = require('../thingboardsConfig');
const deviceService = require('../services/deviceService'); 
const tbConfig = require('../thingboardsConfig'); 

wifi.init({ iface: null });

// --- HELPER: Lấy token đăng nhập ThingsBoard ---
const getThingsBoardToken = async () => {
    try {
        const response = await axios.post(`${TB_SERVER_URL}/api/auth/login`, {
            username: TB_USER,
            password: TB_PASSWORD
        });
        return response.data.token;
    } catch (error) {
        console.error("Lỗi đăng nhập ThingsBoard:", error.message);
        return null;
    }
};

// --- HELPER: Lấy Access Token của thiết bị ---
const getDeviceAccessToken = async (deviceId, jwtToken) => {
    try {
        const response = await axios.get(`${TB_SERVER_URL}/api/device/${deviceId}/credentials`, {
            headers: { 'X-Authorization': `Bearer ${jwtToken}` }
        });
        return response.data.credentialsId;
    } catch (error) {
        return 'N/A'; 
    }
};

// --- 1. Quét WiFi ---
const scanWifiNetworks = async (req, res) => {
    try {
        const networks = await wifi.scan();
        const uniqueSsids = [...new Set(networks.map(n => n.ssid).filter(s => s && s.trim() !== ''))];
        res.status(200).json(uniqueSsids);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi quét WiFi', error: error.message });
    }
};

// --- 2. Lấy danh sách thiết bị (ĐÃ SỬA: Lọc theo Email) ---
const getAllDevices = async (req, res) => {
    try {
        // Lấy email từ Header (Frontend gửi lên)
        const ownerEmail = req.headers['x-user-email'];
        
        // Truyền email vào service để lọc
        const devices = await deviceService.getAllDevices(ownerEmail); 
        res.status(200).json(devices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- 3. TẠO THIẾT BỊ ---
const createDeviceOnThingsBoard = async (req, res) => {
    const { name, type } = req.body;
    if (!name || !type) return res.status(400).json({ error: "Thiếu tên hoặc loại thiết bị" });

    try {
        const jwtToken = await getThingsBoardToken();
        if (!jwtToken) return res.status(500).json({ error: "Lỗi kết nối ThingsBoard" });

        const tbResponse = await axios.post(
            `${TB_SERVER_URL}/api/device`,
            { name: name, type: type, label: name },
            { headers: { 'X-Authorization': `Bearer ${jwtToken}` } }
        );

        const tbDeviceId = tbResponse.data.id.id; 
        const deviceAccessToken = await getDeviceAccessToken(tbDeviceId, jwtToken);

        const newDevice = await deviceService.createDeviceOnThingsBoard({
            name,
            type,
            tb_device_id: tbDeviceId,     
            tb_access_token: deviceAccessToken
            // Lưu ý: Tạo thủ công thì chưa có owner_email, hoặc cần lấy từ token nếu muốn
        });

        res.status(201).json(newDevice);
    } catch (error) {
        console.error("Lỗi tạo:", error.message);
        res.status(500).json({ error: "Lỗi Server: " + error.message });
    }
};

// --- 4. Xóa thiết bị ---
const deleteDevice = async (req, res) => {
    const { id } = req.params;
    const dbId = parseInt(id);

    try {
        const device = await deviceService.getDeviceById(dbId);
        await deviceService.deleteDevice(dbId);
        res.status(200).json({ message: "Xóa thành công" });

        if (device && device.tb_device_id) {
            try {
                const jwtToken = await getThingsBoardToken();
                if (jwtToken) {
                    await axios.delete(`${TB_SERVER_URL}/api/device/${device.tb_device_id}`, {
                        headers: { 'X-Authorization': `Bearer ${jwtToken}` }
                    });
                }
            } catch (e) { console.error(`Lỗi xóa Cloud:`, e.message); }
        }
    } catch (error) {
        if (!res.headersSent) res.status(500).json({ error: error.message });
    }
};

// --- 5. Lấy chi tiết (SỬA: TỰ ĐỘNG LẤY TOKEN NẾU LÀ N/A) ---
const getDeviceDetail = async (req, res) => {
    try {
        const { id } = req.params;
        // Lấy thông tin từ DB local trước
        let device = await deviceService.getDeviceById(id);

        if (!device) {
            return res.status(404).json({ message: "Không tìm thấy thiết bị" });
        }

        // --- LOGIC MỚI: NẾU TOKEN LÀ 'N/A', TỰ ĐỘNG LÊN THINGSBOARD LẤY VỀ ---
        if (device.tb_device_id && (device.tb_access_token === 'N/A' || !device.tb_access_token)) {
            console.log(`>> Token đang thiếu (N/A). Đang lấy từ ThingsBoard...`);
            
            try {
                // 1. Lấy Admin Token để có quyền hỏi
                const jwtToken = await getThingsBoardToken();
                
                // 2. Gọi API lấy Credentials (Mật khẩu)
                const credUrl = `${TB_SERVER_URL}/api/device/${device.tb_device_id}/credentials`;
                const response = await axios.get(credUrl, {
                    headers: { 'X-Authorization': `Bearer ${jwtToken}` }
                });

                // 3. Lấy được Token thật!
                const realToken = response.data.credentialsId; 

                if (realToken) {
                    // 4. Cập nhật ngay vào Database để lần sau không phải hỏi nữa
                    const db = require('../database');
                    db.run("UPDATE devices SET tb_access_token = ? WHERE id = ?", [realToken, id]);
                    
                    // 5. Cập nhật vào biến device để trả về cho Frontend ngay lập tức
                    device.tb_access_token = realToken;
                    console.log(`>> Đã cập nhật Token thành công: ${realToken}`);
                }

            } catch (tbError) {
                console.error(">> Không lấy được Token từ TB:", tbError.message);
                // Nếu lỗi thì đành chịu, vẫn giữ là N/A
            }
        }
        // -----------------------------------------------------------------------

        res.status(200).json(device);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- 6. Cập nhật cấu hình ---
const updateDeviceConfig = async (req, res) => {
    try {
        const { id } = req.params;
        const { wifi_ssid, wifi_password, frequency, alert_config } = req.body;

        await deviceService.updateDeviceInfo(id, { 
            wifi_ssid, wifi_password, frequency, alert_config 
        });
        res.json({ success: true, message: "Cập nhật thành công" });
    } catch (error) {
        res.status(500).json({ error: "Lỗi server" });
    }
};

// --- 7. LẤY DỮ LIỆU TELEMETRY (DYNAMIC - LẤY TẤT CẢ) ---
const getDeviceTelemetry = async (req, res) => {
    try {
        const { id } = req.params;
        const device = await deviceService.getDeviceById(id);
        
        if (!device || !device.tb_device_id) {
            return res.status(404).json({ error: "Thiết bị chưa liên kết ThingsBoard" });
        }

        // Lấy Token
        let jwtToken = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            jwtToken = authHeader.split(' ')[1];
        } else {
            jwtToken = await getThingsBoardToken();
        }

        const headers = { 'X-Authorization': `Bearer ${jwtToken}` };

        try {
            // BƯỚC 1: Hỏi xem thiết bị có những Key nào?
            const keysUrl = `${TB_SERVER_URL}/api/plugins/telemetry/DEVICE/${device.tb_device_id}/keys/timeseries`;
            const keysResponse = await axios.get(keysUrl, { headers });
            const keys = keysResponse.data; // Ví dụ: ['temperature', 'humidity', 'battery', 'co2']

            if (!keys || keys.length === 0) {
                return res.json({}); // Không có dữ liệu gì
            }

            // BƯỚC 2: Lấy giá trị của TẤT CẢ các key đó
            const valuesUrl = `${TB_SERVER_URL}/api/plugins/telemetry/DEVICE/${device.tb_device_id}/values/timeseries?keys=${keys.join(',')}`;
            const valuesResponse = await axios.get(valuesUrl, { headers });
            
            // BƯỚC 3: Làm đẹp dữ liệu trả về Frontend
            // TB trả về: { temperature: [{ts:..., value: 25}], humidity: [...] }
            // Ta chuyển thành: { temperature: 25, humidity: 60, battery: 90 }
            const telemetryData = {};
            for (const key in valuesResponse.data) {
                const dataArray = valuesResponse.data[key];
                if (dataArray && dataArray.length > 0) {
                    // Lấy giá trị mới nhất (phần tử đầu tiên)
                    telemetryData[key] = dataArray[0].value;
                }
            }

            console.log(">> [DYNAMIC TELEMETRY] Trả về:", telemetryData);
            res.json(telemetryData);

        } catch (tbError) {
            console.error(`>> Lỗi TB: ${tbError.message}`);
            // Nếu lỗi 404 ở bước lấy keys nghĩa là thiết bị chưa từng gửi dữ liệu gì
            res.json({}); 
        }

    } catch (error) {
        console.error("Lỗi server:", error);
        res.status(500).json({ error: error.message });
    }
};

// --- 8. ĐỒNG BỘ THIẾT BỊ (ĐÃ SỬA: Lưu Email chủ sở hữu) ---
const syncDevices = async (req, res) => {
    console.log("\n>> --- BẮT ĐẦU ĐỒNG BỘ ---");
    
    // --- SỬA ĐOẠN NÀY ---
    // Express tự động lowercase header, nên dùng 'x-user-email'
    const ownerEmail = req.headers['x-user-email']; 
    
    console.log(">> Backend nhận được Email:", ownerEmail); // Log xem có nhận được không?
    
    if (!ownerEmail) {
        console.warn(">> CẢNH BÁO: Không nhận được Email chủ sở hữu!");
    }
    // --------------------

    let jwtToken = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        jwtToken = authHeader.split(' ')[1];
        console.log(`>> Token User: ${jwtToken.substring(0, 10)}...`);
    } else {
        console.log(`>> Dùng Token Server Config`);
        jwtToken = await getThingsBoardToken();
    }

    if (!jwtToken) return res.status(401).json({ error: "Lỗi xác thực" });

    try {
        let tbDevices = [];
        try {
            const response = await axios.get(
                `${TB_SERVER_URL}/api/tenant/devices?pageSize=100&page=0`,
                { headers: { 'X-Authorization': `Bearer ${jwtToken}` } }
            );
            tbDevices = response.data.data;
        } catch (err) {
            try {
                const userResponse = await axios.get(
                    `${TB_SERVER_URL}/api/user/devices?pageSize=100&page=0`, 
                    { headers: { 'X-Authorization': `Bearer ${jwtToken}` } }
                );
                tbDevices = userResponse.data.data;
            } catch (e) { console.error(">> Lỗi lấy list:", e.message); }
        }

        if (!tbDevices || tbDevices.length === 0) return res.json({ message: "Không tìm thấy thiết bị." });

        let count = 0;
        for (const tbDev of tbDevices) {
            const existing = await new Promise(resolve => {
                const db = require('../database');
                db.get("SELECT id FROM devices WHERE tb_device_id = ?", [tbDev.id.id], (err, row) => resolve(row));
            });

            if (!existing) {
                await deviceService.createDeviceOnThingsBoard({
                    name: tbDev.name,
                    type: tbDev.type,
                    tb_device_id: tbDev.id.id,
                    tb_access_token: 'N/A',
                    owner_email: ownerEmail // <--- Đảm bảo biến này không bị undefined
                });
                count++;
            }
        }
        console.log(`>> Đồng bộ xong. Thêm: ${count}`);
        res.json({ success: true, message: `Đồng bộ xong. Thêm ${count} thiết bị.` });

    } catch (error) {
        console.error(">> LỖI ĐỒNG BỘ:", error.message);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    scanWifiNetworks, getAllDevices, createDeviceOnThingsBoard, deleteDevice,
    getDeviceDetail, updateDeviceConfig, getDeviceTelemetry, syncDevices
};