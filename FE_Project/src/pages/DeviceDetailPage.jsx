import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

function DeviceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);

  // Lấy dữ liệu từ API khi component được render
  useEffect(() => {
    fetch(`/api/devices/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.message) { // Xử lý trường hợp không tìm thấy thiết bị
          setDevice(null);
        } else {
          setDevice(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Lỗi fetch chi tiết thiết bị:", err);
        setLoading(false);
      });
  }, [id]);

  // Hàm xử lý khi nhấn nút "Lưu thay đổi"
  const handleSave = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const configData = {
      wifi_ssid: formData.get('wifi_ssid'),
      wifi_pass: formData.get('wifi_pass'),
      send_interval: Number(formData.get('send_interval')),
    };

    fetch(`/api/devices/${id}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configData),
    })
    .then(res => res.json())
    .then(data => {
      console.log(data.message);
      alert(data.message); // Hiển thị thông báo
      // Không chuyển hướng ngay để người dùng thấy kết quả
      // navigate('/'); 
    })
    .catch(err => {
      console.error("Lỗi lưu cấu hình:", err);
      alert('Lưu cấu hình thất bại!');
    });
  };

  if (loading) return <div>Đang tải...</div>;
  if (!device) return <div>Không tìm thấy thiết bị. <Link to="/devices">Quay lại</Link></div>;

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
              {Object.entries(device.telemetry).map(([key, value]) => (
                <div className="data-point" key={key}>
                  <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cột cấu hình */}
        <div className="detail-side-column">
          <div className="card">
            <div className="card-header">
              <h3>Cấu hình thiết bị</h3>
            </div>
            <form className="card-body config-form" onSubmit={handleSave}>
              <div className="form-group">
                <label htmlFor="wifi_ssid">Tên WiFi (SSID)</label>
                <input type="text" id="wifi_ssid" name="wifi_ssid" defaultValue={device.config.wifi_ssid} />
              </div>
              <div className="form-group">
                <label htmlFor="wifi_pass">Mật khẩu WiFi</label>
                <input type="password" id="wifi_pass" name="wifi_pass" placeholder="Để trống nếu không đổi" />
              </div>
              <div className="form-group">
                <label htmlFor="send_interval">Chu kỳ gửi (giây)</label>
                <input type="number" id="send_interval" name="send_interval" defaultValue={device.config.send_interval} />
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