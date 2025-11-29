import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const DeviceDetailPage = () => { 
  const { id } = useParams();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // State cho Telemetry
  const [telemetry, setTelemetry] = useState({});
  
  // State cho form cấu hình
  const [config, setConfig] = useState({
    wifi_ssid: '',
    wifi_password: '',
    frequency: 5 // Mặc định 5 giây
  });
  const [isSaving, setIsSaving] = useState(false);

  // Hàm lấy dữ liệu thiết bị
  const fetchDevice = async () => {
    try {
      const response = await fetch(`/api/devices/${id}`);
      if (response.ok) {
        const data = await response.json();
        setDevice(data);
        // Nếu thiết bị đã có cấu hình lưu trong DB thì fill vào form (Giả sử API trả về các trường này)
        setConfig({
            wifi_ssid: data.wifi_ssid || '',
            wifi_password: data.wifi_password || '',
            frequency: data.frequency || 10
        });
      }
    } catch (error) { 
      console.error("Error:", error); 
    } finally { 
      setLoading(false); 
    }
  };

  // Hàm lấy Telemetry riêng
  const fetchTelemetry = async () => {
    try {
        const response = await fetch(`/api/devices/${id}/telemetry`);
        if (response.ok) {
            const data = await response.json();
            setTelemetry(data);
        }
    } catch (error) {
        console.error("Lỗi tải telemetry:", error);
    }
  };

  useEffect(() => {
    fetchDevice();
    fetchTelemetry(); // Gọi ngay lần đầu

    // Tự động cập nhật mỗi 5 giây
    const interval = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(interval); // Dọn dẹp khi thoát trang
  }, [id]);

  // Xử lý thay đổi input form
  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  // Gửi cấu hình xuống Backend
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        const response = await fetch(`/api/devices/${id}/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        if (response.ok) {
            alert("Đã lưu cấu hình thành công! Thiết bị sẽ cập nhật trong lần kết nối tới.");
            fetchDevice(); // Tải lại dữ liệu mới
        } else {
            alert("Lỗi khi lưu cấu hình.");
        }
    } catch (error) {
        console.error("Lỗi:", error);
        alert("Lỗi kết nối server.");
    } finally {
        setIsSaving(false);
    }
  };

  // Hàm copy Token
  const copyToken = () => {
    if (device?.tb_access_token) {
        navigator.clipboard.writeText(device.tb_access_token);
        alert("Đã copy Access Token!");
    }
  };

  if (loading) return <div style={{padding: '40px', textAlign: 'center'}}>Đang tải dữ liệu...</div>;
  if (!device) return <div style={{padding: '40px', textAlign: 'center', color: 'red'}}>Không tìm thấy thiết bị</div>;

  return (
    <div className="main-content">
      {/* Breadcrumb điều hướng */}
      <div className="breadcrumb">
        <Link to="/">Danh sách thiết bị</Link> / <span>{device.name}</span>
      </div>

      <div className="device-detail-grid">
        
        {/* CỘT 1: THÔNG TIN CHUNG */}
        <div className="card">
            <div className="card-header">
                <h2>ℹ️ Thông tin thiết bị</h2>
                <span className={`status-badge ${device.status === 'active' ? 'online' : 'offline'}`}>
                    {device.status === 'active' ? 'Đang hoạt động' : 'Mất kết nối'}
                </span>
            </div>
            <div className="card-body">
                <p><strong>Tên thiết bị:</strong> {device.name}</p>
                <p><strong>Loại (Type):</strong> {device.type}</p>
                <p><strong>ID Hệ thống:</strong> #{device.id}</p>
                <p><strong>ThingsBoard ID:</strong> <span style={{fontSize: '0.85rem', color: '#666'}}>{device.tb_device_id || 'Chưa đồng bộ'}</span></p>
                
                <div style={{marginTop: '20px'}}>
                    <label style={{fontWeight: '600', display: 'block', marginBottom: '5px'}}>🔑 Access Token (Dùng cho Code ESP32):</label>
                    <div className="token-display" style={{display: 'flex', gap: '10px'}}>
                        <code style={{background: '#f4f4f4', padding: '10px', borderRadius: '5px', flex: 1, wordBreak: 'break-all', color: '#d63384'}}>
                            {device.tb_access_token || 'Đang tạo...'}
                        </code>
                        <button 
                            onClick={copyToken}
                            style={{background: '#87CEEB', color: 'white', border: 'none', borderRadius: '5px', padding: '0 15px'}}
                        >
                            Copy
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* CỘT 2: CẤU HÌNH TỪ XA */}
        <div className="card">
            <div className="card-header" style={{backgroundColor: '#f9fafb'}}>
                <h2>⚙️ Cấu hình từ xa</h2>
            </div>
            <div className="card-body">
                <form onSubmit={handleSaveConfig} className="config-form">
                    <div className="form-group" style={{marginBottom: '20px'}}>
                        <label>Tên Wifi (SSID)</label>
                        <input 
                            type="text" 
                            name="wifi_ssid"
                            value={config.wifi_ssid}
                            onChange={handleConfigChange}
                            placeholder="Nhập tên Wifi cho thiết bị..."
                            style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px'}}
                        />
                    </div>

                    <div className="form-group" style={{marginBottom: '20px'}}>
                        <label>Mật khẩu Wifi</label>
                        <input 
                            type="text" 
                            name="wifi_password"
                            value={config.wifi_password}
                            onChange={handleConfigChange}
                            placeholder="Nhập mật khẩu Wifi..."
                            style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px'}}
                        />
                    </div>

                    <div className="form-group" style={{marginBottom: '30px'}}>
                        <label>Tần suất gửi dữ liệu (Giây)</label>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                            <input 
                                type="number" 
                                name="frequency"
                                value={config.frequency}
                                onChange={handleConfigChange}
                                min="1"
                                style={{width: '100px', padding: '10px', border: '1px solid #ddd', borderRadius: '8px'}}
                            />
                            <span style={{color: '#666'}}>giây / lần</span>
                        </div>
                        <p style={{fontSize: '0.8rem', color: '#999', marginTop: '5px'}}>
                            * Thời gian ESP32 gửi dữ liệu lên ThingsBoard.
                        </p>
                    </div>

                    <button 
                        type="submit" 
                        className="btn-submit-custom" 
                        style={{width: '100%', borderRadius: '8px'}}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Đang lưu...' : 'Lưu Cấu Hình'}
                    </button>
                </form>
            </div>
        </div>

      </div>

      {/* PHẦN MỚI: HIỂN THỊ TELEMETRY (Clean Version - No Icon) */}
      <div className="telemetry-section" style={{marginTop: '30px'}}>
        <h2 style={{fontSize: '1.3rem', marginBottom: '20px', color: '#333'}}>📊 Giám sát dữ liệu (Real-time)</h2>
        
        {Object.keys(telemetry).length === 0 ? (
            <div style={{background: 'white', padding: '30px', borderRadius: '12px', textAlign: 'center', color: '#888', border: '1px dashed #ccc'}}>
                Đang chờ dữ liệu từ thiết bị...
            </div>
        ) : (
            <div className="telemetry-cards-container">
                {Object.entries(telemetry).map(([key, value]) => (
                    <div key={key} className="telemetry-card">
                        {/* Bỏ hoàn toàn logic icon, chỉ còn Label và Value xếp chồng lên nhau */}
                        <span className="telemetry-label">{key}</span>
                        <span className="telemetry-value">{value}</span>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default DeviceDetailPage;