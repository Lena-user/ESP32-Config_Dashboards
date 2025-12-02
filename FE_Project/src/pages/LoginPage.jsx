import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPage = ({ onLoginSuccess }) => {
    const [isRegistering, setIsRegistering] = useState(false); // Chuyển đổi giữa Login/Register
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                if (isRegistering) {
                    alert("Đăng ký thành công! Vui lòng đăng nhập.");
                    setIsRegistering(false);
                } else {
                    // Đăng nhập thành công
                    localStorage.setItem('user', JSON.stringify(data.user)); // Lưu vào LocalStorage
                    onLoginSuccess(data.user); // Cập nhật State ở App
                    navigate('/'); // Chuyển về trang chủ
                }
            } else {
                setError(data.error || "Có lỗi xảy ra");
            }
        } catch (err) {
            setError("Lỗi kết nối Server");
        }
    };

    return (
        <div className="login-page-container">
            <div className="login-container" style={{maxWidth: '400px', width: '100%'}}>
                <h2 style={{textAlign: 'center', color: '#87CEEB', marginBottom: '20px', textTransform: 'uppercase'}}>
                    {isRegistering ? '📝 Đăng Ký' : '🔐 Đăng Nhập'}
                </h2>
                
                {error && <p style={{color: 'red', textAlign: 'center', marginBottom: '15px'}}>{error}</p>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{marginBottom: '15px'}}>
                        <label>Email</label>
                        <input 
                            type="email" name="email" required 
                            value={formData.email} onChange={handleChange}
                            style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px'}}
                        />
                    </div>
                    <div className="form-group" style={{marginBottom: '20px'}}>
                        <label>Mật khẩu</label>
                        <input 
                            type="password" name="password" required 
                            value={formData.password} onChange={handleChange}
                            style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px'}}
                        />
                    </div>

                    <button type="submit" className="btn-submit-custom" style={{width: '100%'}}>
                        {isRegistering ? 'ĐĂNG KÝ NGAY' : 'ĐĂNG NHẬP'}
                    </button>
                </form>

                <div style={{marginTop: '20px', textAlign: 'center', fontSize: '0.9rem'}}>
                    {isRegistering ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
                    <span 
                        style={{color: '#007bff', cursor: 'pointer', fontWeight: 'bold'}}
                        onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                    >
                        {isRegistering ? "Đăng nhập" : "Đăng ký ngay"}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;