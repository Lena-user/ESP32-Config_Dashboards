import React from 'react';
import { Link } from 'react-router-dom';

function Header({ user, onLogout, onOpenLogin }) {
  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">IOT Dashboard</Link>

        <div style={{flex: 1}}></div> 

        <div className="user-area">
            {user ? (
                // Nút Sign Out
                <div 
                    className="user-profile" 
                    onClick={onLogout} 
                    title="Nhấn để đăng xuất"
                    style={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'transparent',
                        border: 'none',
                        boxShadow: 'none',
                        padding: '0',
                        color: '#dc3545', 
                        fontWeight: '600',
                        fontSize: '0.95rem'
                    }}
                >
                    <span>Sign Out</span>
                    <span style={{fontSize: '1.1rem'}}>🚪</span> 
                </div>
            ) : (
                // Nút Đăng nhập
                <div 
                    onClick={onOpenLogin}
                    style={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: 'white', 
                        fontWeight: '600',
                        fontSize: '0.95rem',
                        userSelect: 'none'
                    }}
                >
                    <span>Đăng nhập</span>
                    <span style={{fontSize: '1.1rem'}}>🔐</span>
                </div>
            )}
        </div>
      </div>
    </header>
  );
}

export default Header;