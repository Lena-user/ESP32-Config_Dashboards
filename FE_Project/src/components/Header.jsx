import React from 'react';
import { Link, useLocation } from 'react-router-dom';

// Thêm prop onOpenLogin
function Header({ user, onLogout, onOpenLogin }) {
  const location = useLocation();

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">IOT Dashboard</Link>

        {/* Chỉ hiện Menu khi đã đăng nhập */}
        {user && (
            <nav className="nav-menu">
            <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Dashboard</Link>
            <Link to="/devices" className={location.pathname.includes('/devices') ? 'active' : ''}>Thiết bị</Link>
            <Link to="/settings">Cài đặt</Link>
            </nav>
        )}

        <div className="user-area">
            {user ? (
                <div className="user-profile" onClick={onLogout} style={{cursor: 'pointer'}} title="Đăng xuất">
                    <span>{user.email.split('@')[0]}</span>
                    <span className="user-icon">👤</span>
                </div>
            ) : (
                // Nút Đăng nhập Minimalist
                <button 
                    onClick={onOpenLogin}
                    style={{
                        background: 'white', 
                        color: '#87CEEB', 
                        border: 'none', 
                        padding: '8px 25px', 
                        borderRadius: '20px', 
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                    }}
                >
                    Đăng nhập
                </button>
            )}
        </div>
      </div>
    </header>
  );
}

export default Header;