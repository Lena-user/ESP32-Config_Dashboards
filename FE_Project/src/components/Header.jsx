import React from 'react';
// Import Link/NavLink từ react-router-dom sau khi cài đặt
import { Link, NavLink } from 'react-router-dom';

function Header() {
  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">IOT Dashboard</Link> {/* Đổi tên logo */}
      </div>
    </header>
  );
}

export default Header;