import React, { useState } from 'react';

const LoginModal = ({ isOpen, onClose, onLoginSuccess }) => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        
        // Luôn gọi API login
        const endpoint = '/api/auth/login';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('user', JSON.stringify(data.user));
                onLoginSuccess(data.user);
                onClose();
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
                        <div className="form-group">
                            <input 
                                type="password" name="password" required 
                                value={formData.password} onChange={handleChange}
                                placeholder="Mật khẩu..."
                            />
                        </div>
                        
                        {/* Bỏ phần chuyển đổi Đăng ký */}
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