import React from 'react';
// Thêm useNavigate vào import
import { useParams, Link, useNavigate } from 'react-router-dom';

// Giả lập dữ liệu chi tiết cho một thiết bị
const mockDeviceDetails = {
  id: 'dht11-01',
  name: 'Cảm biến Phòng khách',
  type: 'DHT11',
  status: 'Online',
  lastSeen: '2025-11-03 10:30:00',
  telemetry: {
    temperature: '25.5°C',
    humidity: '60%',
  },
  config: {
    wifi_ssid: 'MyHomeNetwork',
    send_interval: 300, // seconds
  },
};

function DeviceDetailPage() {
  const { id } = useParams(); // Lấy ID thiết bị từ URL
  const navigate = useNavigate(); // Khởi tạo hook navigate

  // Trong thực tế, bạn sẽ dùng `id` để fetch dữ liệu từ API
  const device = mockDeviceDetails;

  // Hàm xử lý khi nhấn nút "Lưu thay đổi"
  const handleSave = (event) => {
    event.preventDefault(); // Ngăn form gửi đi và tải lại trang
    
    // Tại đây, bạn sẽ thêm logic để gửi dữ liệu lên API
    console.log('Đã lưu thay đổi! Đang chuyển về trang chủ...');

    // Chuyển hướng về trang chủ
    navigate('/'); 
  };

  return (
    <div className="main-content">
      <div className="breadcrumb">
        <Link to="/devices">Danh Sách Thiết Bị</Link> &gt; {device.name}
      </div>
      
      <div className="device-detail-grid">
        {/* Cột thông tin và biểu đồ */}
        <div className="detail-main-column">
          <div className="card">
            <div className="card-header">
              <h2>{device.name}</h2>
              <div className={`status-badge ${device.status.toLowerCase()}`}>
                <span className={`status-dot ${device.status.toLowerCase()}`}></span>
                {device.status}
              </div>
            </div>
            <div className="card-body">
              <p><strong>ID:</strong> {device.id}</p>
              <p><strong>Loại:</strong> {device.type}</p>
              <p><strong>Lần cuối hoạt động:</strong> {device.lastSeen}</p>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h3>Dữ liệu cảm biến</h3>
            </div>
            <div className="card-body telemetry-data">
              {/* Đây là nơi bạn sẽ đặt biểu đồ */}
              <div className="data-point">
                <span>Nhiệt độ</span>
                <strong>{device.telemetry.temperature}</strong>
              </div>
              <div className="data-point">
                <span>Độ ẩm</span>
                <strong>{device.telemetry.humidity}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Cột cấu hình */}
        <div className="detail-side-column">
          <div className="card">
            <div className="card-header">
              <h3>Cấu hình thiết bị</h3>
            </div>
            {/* Thêm sự kiện onSubmit vào form */}
            <form className="card-body config-form" onSubmit={handleSave}>
              <div className="form-group">
                <label htmlFor="wifi_ssid">Tên WiFi (SSID)</label>
                <input type="text" id="wifi_ssid" defaultValue={device.config.wifi_ssid} />
              </div>
              <div className="form-group">
                <label htmlFor="wifi_pass">Mật khẩu WiFi</label>
                <input type="password" id="wifi_pass" placeholder="Để trống nếu không đổi" />
              </div>
              <div className="form-group">
                <label htmlFor="send_interval">Chu kỳ gửi (giây)</label>
                <input type="number" id="send_interval" defaultValue={device.config.send_interval} />
              </div>
              <button type="submit" className="save-config-btn">Lưu thay đổi</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeviceDetailPage;