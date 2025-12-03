const db = require('../database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios'); // Import axios
// Import file cấu hình để lấy URL chuẩn (https://app.coreiot.io)
const tbConfig = require('../thingboardsConfig');

const SECRET_KEY = 'your_secret_key_123'; // Nên đưa vào biến môi trường
const THINGSBOARD_URL = tbConfig.TB_SERVER_URL; // ⚠️ THAY ĐỔI URL NÀY THÀNH URL THINGSBOARD CỦA BẠN (VD: http://192.168.1.100:8080)

// --- ĐÃ XÓA HÀM REGISTER ---

// Đăng nhập (Logic: Check ThingsBoard trước -> Check Local sau)
const login = async (req, res) => {
    const { email, password } = req.body;

    console.log(`>> Đang gửi yêu cầu đến: ${THINGSBOARD_URL}/api/auth/login`);
    console.log(`>> Email: ${email}`);

    try {
        const tbResponse = await axios.post(`${THINGSBOARD_URL}/api/auth/login`, {
            username: email, 
            password: password
        });

        if (tbResponse.data && tbResponse.data.token) {
            console.log(">> Đăng nhập THÀNH CÔNG!");
            return res.json({ 
                token: tbResponse.data.token, 
                user: { email: email, role: 'admin', source: 'CoreIOT' } 
            });
        }
    } catch (error) {
        console.error(">> LỖI ĐĂNG NHẬP:");
        if (error.response) {
            console.error("   Status:", error.response.status);
            // CoreIOT thường trả về message lỗi cụ thể ở đây
            console.error("   Data:", error.response.data);
        } else {
            console.error("   Message:", error.message);
        }
        
        return res.status(401).json({ 
            error: "Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản CoreIOT." 
        });
    }
};

module.exports = { login }; // Chỉ export login