import React from 'react';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-column">
          <div className="footer-logo">IOT Dashboard</div>
          <p>Một dự án quản lý và giám sát các thiết bị IoT một cách hiệu quả và trực quan.</p>
        </div>

        <div className="footer-column">
          <h3>Điều hướng</h3>
          <ul>
            <li><Link to="/">Dashboard</Link></li>
            <li><Link to="/devices">Quản lý thiết bị</Link></li>
            {/* Thêm các link khác nếu có */}
          </ul>
        </div>

        <div className="footer-column">
          <h3>Hỗ trợ</h3>
          <ul>
            <li><a href="#">Tài liệu API</a></li>
            <li><a href="#">Hướng dẫn sử dụng</a></li>
            <li><a href="#">Báo cáo lỗi</a></li>
          </ul>
        </div>

        <div className="footer-column">
          <h3>Thông tin dự án</h3>
          <p>Thực hiện bởi Nhóm X</p>
          <p>Email: contact@example.com</p>
          <div className="social-icons">
            {/* Thay bằng link GitHub của dự án */}
            <a href="#">Git</a> 
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;