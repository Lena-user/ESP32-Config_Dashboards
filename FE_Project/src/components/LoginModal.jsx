import React, { useState } from 'react';

const LoginModal = ({ isOpen, onClose, onLoginSuccess }) => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false); // State để quản lý việc hiện/ẩn mật khẩu

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        
        const endpoint = '/api/auth/login';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                // --- SỬA ĐOẠN NÀY ---
                // Lưu Token và User Info vào LocalStorage
                // Token này dùng để chứng minh "tôi đã đăng nhập" ở lần sau
                localStorage.setItem('iot_token', data.token); 
                localStorage.setItem('iot_user', JSON.stringify(data.user));
                
                onLoginSuccess(data.user);
                onClose();
                // --------------------
            } else {
                setError(data.error || "Sai email hoặc mật khẩu");
            }
        } catch (err) {
            setError("Lỗi kết nối Server");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                
                <div className="modal-header-custom">
                    <h2>🔐 ĐĂNG NHẬP QUẢN TRỊ</h2>
                    <button className="modal-close-btn-custom" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body-custom">
                        {error && <p style={{color: 'red', textAlign: 'center', marginBottom: '15px'}}>{error}</p>}
                        
                        <div className="form-group">
                            <input 
                                type="email" name="email" required 
                                value={formData.email} onChange={handleChange}
                                placeholder="Email quản trị..."
                            />
                        </div>

                        <div className="form-group" style={{position: 'relative'}}>
                            <input 
                                type={showPassword ? "text" : "password"} // Chuyển đổi type giữa 'text' và 'password'
                                name="password" required 
                                value={formData.password} onChange={handleChange}
                                placeholder="Mật khẩu..."
                                style={{paddingRight: '40px'}} // Thêm padding bên phải để chữ không đè lên icon
                            />
                            
                            <span 
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    cursor: 'pointer',
                                    fontSize: '1.2rem',
                                    userSelect: 'none',
                                    color: '#666'
                                }}
                                title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                            >
                                {showPassword ? "🙈" : "👁️"}
                            </span>
                        </div>
                    </div>

                    <div className="modal-footer-custom">
                        <button type="submit" className="btn-submit-custom" disabled={isLoading}>
                            {isLoading ? 'ĐANG XỬ LÝ...' : 'ĐĂNG NHẬP'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginModal;