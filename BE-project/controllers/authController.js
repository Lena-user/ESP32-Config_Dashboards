const db = require('../database');

// Đăng ký
const register = (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Thiếu thông tin" });

    // Lưu user vào DB (Lưu ý: Thực tế nên mã hóa password bằng bcrypt, ở đây làm đơn giản demo)
    const sql = "INSERT INTO users (email, password) VALUES (?, ?)";
    db.run(sql, [email, password], function(err) {
        if (err) {
            if (err.message.includes("UNIQUE")) return res.status(400).json({ error: "Email đã tồn tại" });
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: "Đăng ký thành công", userId: this.lastID });
    });
};

// Đăng nhập
const login = (req, res) => {
    const { email, password } = req.body;
    const sql = "SELECT * FROM users WHERE email = ? AND password = ?";
    
    db.get(sql, [email, password], (err, row) => {
        if (err) return res.status(500).json({ error: "Lỗi Server" });
        if (!row) return res.status(401).json({ error: "Sai email hoặc mật khẩu" });

        // Trả về thông tin user (Thực tế nên trả về JWT Token)
        res.status(200).json({ 
            message: "Đăng nhập thành công",
            user: { id: row.id, email: row.email }
        });
    });
};

module.exports = { register, login };