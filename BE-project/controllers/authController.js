const db = require('../database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { TB_SERVER_URL } = require('../thingboardsConfig');

const SECRET_KEY = "my_super_secret_key_123";

// --- HÀM NÀY ĐÃ ĐƯỢC THÊM LOG DEBUG ---
const loginThingsBoard = async (email, password) => {
    const cleanUrl = TB_SERVER_URL.replace(/\/+$/, '');
    console.log(`\n>> [DEBUG] Đang thử Login ThingsBoard...`);
    console.log(`>> URL: ${cleanUrl}`);
    console.log(`>> User: ${email}`);

    try {
        const response = await axios.post(`${cleanUrl}/api/auth/login`, {
            username: email,
            password: password
        });
        console.log(">> [THÀNH CÔNG] Đã lấy được Token từ ThingsBoard!");
        return response.data.token;
    } catch (error) {
        console.error(">> [THẤT BẠI] Không lấy được Token ThingsBoard.");
        console.error(`>> Lỗi: ${error.message}`);
        if (error.response) {
            console.error(`>> Status Code: ${error.response.status}`);
            console.error(`>> Lý do: ${JSON.stringify(error.response.data)}`);
        }
        return null; 
    }
};

const sendLoginSuccess = (res, user, tbToken) => {
    const localToken = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '24h' });
    
    // Log cảnh báo nếu không có tbToken
    if (!tbToken) {
        console.warn(">> [CẢNH BÁO] Trả về Client mà KHÔNG CÓ Token ThingsBoard.");
    }

    res.json({ 
        message: "Đăng nhập thành công", 
        token: localToken, 
        user: { id: user.id, email: user.email, name: user.name },
        tb_token: tbToken 
    });
};

const login = async (req, res) => {
    const { email, password } = req.body;

    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
        if (err) return res.status(500).json({ error: "Lỗi Server Database" });

        if (user) {
            const validPass = bcrypt.compareSync(password, user.password);
            
            if (!validPass) {
                // Pass local sai -> Check TB
                const tbToken = await loginThingsBoard(email, password);
                if (tbToken) {
                    const newHash = bcrypt.hashSync(password, 10);
                    db.run("UPDATE users SET password = ? WHERE id = ?", [newHash, user.id]);
                    return sendLoginSuccess(res, user, tbToken);
                }
                return res.status(400).json({ error: "Sai mật khẩu" });
            }

            // Pass local đúng -> Lấy Token TB
            const tbToken = await loginThingsBoard(email, password);
            return sendLoginSuccess(res, user, tbToken);
        }

        if (!user) {
            // User chưa có -> Check TB để tạo mới
            const tbToken = await loginThingsBoard(email, password);
            
            if (tbToken) {
                const hashedPassword = bcrypt.hashSync(password, 10);
                const name = email.split('@')[0];

                db.run("INSERT INTO users (email, password, name) VALUES (?, ?, ?)", 
                    [email, hashedPassword, name], 
                    function(err) {
                        if (err) return res.status(500).json({ error: "Lỗi tạo user local" });
                        const newUser = { id: this.lastID, email, name };
                        return sendLoginSuccess(res, newUser, tbToken);
                    }
                );
            } else {
                return res.status(400).json({ error: "Tài khoản không tồn tại hoặc sai mật khẩu" });
            }
        }
    });
};

module.exports = { login };