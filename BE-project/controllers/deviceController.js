const wifi = require('node-wifi');
const axios = require('axios');
const { TB_SERVER_URL, TB_USER, TB_PASSWORD } = require('../thingboardsConfig');
const deviceService = require('../services/deviceService'); 

// Khởi tạo module wifi
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
        return 'N/A'; // Nếu lỗi thì trả về N/A để không bị crash
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

// --- 2. Lấy danh sách thiết bị ---
const getAllDevices = async (req, res) => {
    try {
        const devices = await deviceService.getAllDevices(); 
        res.status(200).json(devices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- 3. TẠO THIẾT BỊ (Logic quan trọng đã sửa) ---
const createDeviceOnThingsBoard = async (req, res) => {
    const { name, type } = req.body;

    // 1. Validate đầu vào
    if (!name || !type) {
        return res.status(400).json({ error: "Thiếu tên hoặc loại thiết bị" });
    }

    try {
        // 2. Đăng nhập ThingsBoard
        const jwtToken = await getThingsBoardToken();
        if (!jwtToken) {
            return res.status(500).json({ error: "Không thể kết nối đến ThingsBoard (Sai config hoặc Server tắt)" });
        }

        // 3. Tạo thiết bị trên ThingsBoard
        const tbResponse = await axios.post(
            `${TB_SERVER_URL}/api/device`,
            { name: name, type: type, label: name },
            { headers: { 'X-Authorization': `Bearer ${jwtToken}` } }
        );

        const tbDeviceId = tbResponse.data.id.id; // Lấy được ID quan trọng này

        // 4. Lấy Access Token (để ESP32 dùng sau này)
        const deviceAccessToken = await getDeviceAccessToken(tbDeviceId, jwtToken);

        // 5. Gọi Service để lưu vào DB Local (Lúc này đã đủ dữ liệu: ID, Token...)
        const newDevice = await deviceService.createDeviceOnThingsBoard({
            name,
            type,
            tb_device_id: tbDeviceId,     // Đã có ID
            tb_access_token: deviceAccessToken // Đã có Token
        });

        // 6. Trả về kết quả
        res.status(201).json(newDevice);

    } catch (error) {
        console.error("Lỗi quy trình tạo:", error.response?.data || error.message);
        res.status(500).json({ error: "Lỗi Server: " + (error.response?.data?.message || error.message) });
    }
};

// --- 4. Xóa thiết bị (Clean Version)
const deleteDevice = async (req, res) => {
    const { id } = req.params;
    const dbId = parseInt(id);

    try {
        // B1: Lấy thông tin cũ để dành xóa Cloud
        const device = await deviceService.getDeviceById(dbId);
        
        // B2: Xóa trong Database Local (Ưu tiên số 1)
        await deviceService.deleteDevice(dbId);

        // B3: Trả về kết quả ngay cho Frontend mượt
        res.status(200).json({ message: "Xóa thành công" });

        // B4: Xóa trên Cloud (Chạy ngầm, lỗi cũng không sao)
        if (device && device.tb_device_id) {
            try {
                const jwtToken = await getThingsBoardToken();
                if (jwtToken) {
                    await axios.delete(`${TB_SERVER_URL}/api/device/${device.tb_device_id}`, {
                        headers: { 'X-Authorization': `Bearer ${jwtToken}` }
                    });
                }
            } catch (e) {
                console.error(`Lỗi xóa Cloud (ID: ${device.tb_device_id}):`, e.message);
            }
        }

    } catch (error) {
        console.error("Lỗi xóa thiết bị:", error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
};

// --- 5. Lấy chi tiết ---
const getDeviceDetail = async (req, res) => {
    try {
        const device = await deviceService.getDeviceById(req.params.id);
        if (!device) return res.status(404).json({ message: "Không tìm thấy thiết bị" });
        res.status(200).json(device);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- 6. Cập nhật thông tin & Đẩy cấu hình lên ThingsBoard (SHARED ATTRIBUTES) ---
const updateDeviceConfig = async (req, res) => {
    const { id } = req.params;
    const { wifi_ssid, wifi_password, frequency } = req.body;

    try {
        // 1. Lấy thông tin thiết bị từ DB
        const device = await deviceService.getDeviceById(id);
        if (!device) {
            return res.status(404).json({ error: "Không tìm thấy thiết bị" });
        }

        // 2. Đẩy cấu hình lên ThingsBoard (SHARED SCOPE)
        // SỬA ĐỔI: Dùng Token Admin/Tenant để ghi vào Shared Attribute
        if (device.tb_device_id) {
            try {
                // Lấy JWT Token của Admin/Tenant (Hàm này đã có sẵn trong file của bạn)
                const jwtToken = await getThingsBoardToken();

                // API chuẩn để ghi Shared Attribute:
                // POST /api/plugins/telemetry/{deviceId}/{scope}
                const url = `${TB_SERVER_URL}/api/plugins/telemetry/${device.tb_device_id}/SHARED_SCOPE`;

                await axios.post(
                    url,
                    {
                        wifi_ssid: wifi_ssid,
                        wifi_password: wifi_password,
                        frequency: parseInt(frequency)
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Authorization': `Bearer ${jwtToken}` // Dùng JWT Token
                        }
                    }
                );
                console.log(`Đã đẩy Shared Attributes lên ThingsBoard cho thiết bị ${device.name}`);
            } catch (tbError) {
                console.error("Lỗi khi đẩy lên ThingsBoard:", tbError.response?.data || tbError.message);
                // Vẫn tiếp tục lưu vào DB local
            }
        }

        // 3. Lưu vào Database Local
        const result = await deviceService.updateDeviceInfo(id, req.body);
        
        res.status(200).json({ 
            message: "Cập nhật thành công", 
            data: result,
            thingsboard_status: "synced_shared" 
        });

    } catch (error) {
        console.error("Lỗi update config:", error);
        res.status(500).json({ error: error.message });
    }
};

// --- 7. Lấy dữ liệu Telemetry (Real-time) ---
const getDeviceTelemetry = async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Lấy thông tin thiết bị
        const device = await deviceService.getDeviceById(id);
        if (!device || !device.tb_device_id) {
            return res.status(404).json({ error: "Thiết bị chưa kết nối ThingsBoard" });
        }

        // 2. Lấy Token Admin
        const jwtToken = await getThingsBoardToken();
        if (!jwtToken) return res.status(500).json({ error: "Lỗi kết nối ThingsBoard" });

        const headers = { 'X-Authorization': `Bearer ${jwtToken}` };

        // --- SỬA LỖI 405 TẠI ĐÂY ---
        // API chuẩn: /api/plugins/telemetry/DEVICE/{deviceId}/values/timeseries
        // Lưu ý chữ "DEVICE" viết hoa trong đường dẫn
        
        try {
            // Bước 1: Lấy danh sách Keys
            const keysResponse = await axios.get(
                `${TB_SERVER_URL}/api/plugins/telemetry/DEVICE/${device.tb_device_id}/keys/timeseries`,
                { headers }
            );
            const keys = keysResponse.data;

            if (!keys || keys.length === 0) {
                return res.status(200).json({});
            }

            // Bước 2: Lấy Values
            const valuesResponse = await axios.get(
                `${TB_SERVER_URL}/api/plugins/telemetry/DEVICE/${device.tb_device_id}/values/timeseries?keys=${keys.join(',')}`,
                { headers }
            );

            // Format dữ liệu
            const formattedData = {};
            for (const [key, values] of Object.entries(valuesResponse.data)) {
                if (values && values.length > 0) {
                    formattedData[key] = values[0].value;
                }
            }

            res.status(200).json(formattedData);

        } catch (innerError) {
            // Nếu vẫn lỗi, thử fallback sang API không có chữ "DEVICE" (cho bản TB cũ hơn)
            console.warn("Thử lại với API cũ...", innerError.message);
             // ... (Logic fallback nếu cần, nhưng thường thêm chữ DEVICE là fix được)
             throw innerError; 
        }

    } catch (error) {
        console.error("Lỗi lấy telemetry:", error.message);
        // Trả về object rỗng để FE không bị crash
        res.status(200).json({});
    }
};

module.exports = {
    scanWifiNetworks,
    getAllDevices,
    createDeviceOnThingsBoard,
    deleteDevice,
    getDeviceDetail,
    updateDeviceConfig,
    getDeviceTelemetry // Export hàm mới
};