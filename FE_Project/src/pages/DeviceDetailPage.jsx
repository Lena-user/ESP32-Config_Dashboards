import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const DeviceDetailPage = () => { 
  const { id } = useParams();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [telemetry, setTelemetry] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // --- STATE MỚI: QUẢN LÝ MODAL GỘP ---
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [activeTab, setActiveTab] = useState('wifi'); // 'wifi' | 'frequency' | 'alert'

  // State cấu hình thiết bị (Server)
  const [config, setConfig] = useState({
    wifi_ssid: '',
    wifi_password: '',
    frequency: 10
  });

  // State cấu hình cảnh báo
  const [alertConfig, setAlertConfig] = useState({
    temperature: { min: 0, max: 50 },
    humidity: { min: 20, max: 80 }
  });

  const [isSaving, setIsSaving] = useState(false);

  // --- HÀM LOGIC CẢNH BÁO ---
  const getAlertStatus = (key, value) => {
    const k = key.toLowerCase(); 
    const val = parseFloat(value);
    let configKey = null;
    if (k.includes('temp')) configKey = 'temperature';
    else if (k.includes('hum')) configKey = 'humidity';

    if (configKey && alertConfig[configKey] && !isNaN(val)) {
        const { min, max } = alertConfig[configKey];
        const minVal = parseFloat(min);
        const maxVal = parseFloat(max);

        if (!isNaN(maxVal) && val > maxVal) return { color: '#dc3545', bg: '#ffe6e6', status: 'DANGER', msg: `> ${maxVal}` };
        if (!isNaN(minVal) && val < minVal) return { color: '#dc3545', bg: '#ffe6e6', status: 'DANGER', msg: `< ${minVal}` };
    }
    return { color: '#333', bg: '#fff', status: 'NORMAL', msg: '' };
  };

  // --- FETCH DATA ---
  const fetchDevice = async () => {
    try {
      const response = await fetch(`/api/devices/${id}`);
      if (response.ok) {
        const data = await response.json();
        setDevice(data);
        
        // 1. Nạp cấu hình Wifi/Frequency
        setConfig({
            wifi_ssid: data.wifi_ssid || '',
            wifi_password: data.wifi_password || '',
            frequency: data.frequency || 10
        });

        // 2. Nạp cấu hình Alert từ Database (Thay vì LocalStorage)
        if (data.alert_config) {
            try {
                // Backend trả về chuỗi JSON, cần parse ra object
                const parsedAlerts = typeof data.alert_config === 'string' 
                    ? JSON.parse(data.alert_config) 
                    : data.alert_config;
                setAlertConfig(parsedAlerts);
            } catch (e) {
                console.error("Lỗi parse alert_config:", e);
            }
        }
      }
    } catch (error) { console.error("Error:", error); } finally { setLoading(false); }
  };

  const fetchDeviceDetail = async () => {
    try {
      const token = localStorage.getItem('iot_token');
      const tbToken = localStorage.getItem('tb_token'); // Lấy token TB

      const response = await fetch(`/api/devices/${id}`, {
          headers: { 
              'Authorization': `Bearer ${token}`,
              'x-tb-token': tbToken // Gửi kèm token TB qua header riêng
          }
      });
      if (response.ok) {
        const data = await response.json();
        setDevice(data);
        
        // 1. Nạp cấu hình Wifi/Frequency
        setConfig({
            wifi_ssid: data.wifi_ssid || '',
            wifi_password: data.wifi_password || '',
            frequency: data.frequency || 10
        });

        // 2. Nạp cấu hình Alert từ Database (Thay vì LocalStorage)
        if (data.alert_config) {
            try {
                // Backend trả về chuỗi JSON, cần parse ra object
                const parsedAlerts = typeof data.alert_config === 'string' 
                    ? JSON.parse(data.alert_config) 
                    : data.alert_config;
                setAlertConfig(parsedAlerts);
            } catch (e) {
                console.error("Lỗi parse alert_config:", e);
            }
        }
      }
    } catch (error) { console.error("Error:", error); } finally { setLoading(false); }
  };

  const fetchTelemetry = async () => {
    try {
      const token = localStorage.getItem('iot_token');
      const tbToken = localStorage.getItem('tb_token'); // Lấy token TB

      const response = await fetch(`/api/devices/${id}/telemetry`, {
          headers: { 
              'Authorization': `Bearer ${token}`,
              'x-tb-token': tbToken // Gửi kèm token TB
          }
      });
      if (response.ok) {
          const data = await response.json();
          setTelemetry(data);
          setLastUpdated(new Date());
      }
    } catch (error) { console.error("Lỗi tải telemetry:", error); }
  };

  useEffect(() => {
    fetchDevice();
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 2000);
    return () => clearInterval(interval);
  }, [id]);

  // --- HANDLERS ---
  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleAlertConfigChange = (key, type, value) => {
    setAlertConfig(prev => ({
        ...prev,
        [key]: { ...prev[key], [type]: value }
    }));
  };

  // --- 1. HÀM MỚI: CHỈ LƯU WIFI ---
  const handleSaveWifiConfig = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        const token = localStorage.getItem('iot_token');
        const tbToken = localStorage.getItem('tb_token');

        // Chỉ đóng gói Wifi để gửi đi
        const payload = {
            wifi_ssid: config.wifi_ssid,
            wifi_password: config.wifi_password
        };

        const response = await fetch(`/api/devices/${id}/config`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`, 
                'x-tb-token': tbToken               
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("Đã cập nhật Wifi thành công!");
            fetchDevice();
            setShowConfigModal(false);
        } else { alert("Lỗi khi lưu Wifi."); }
    } catch (error) { alert("Lỗi kết nối server."); } finally { setIsSaving(false); }
  };

  // --- 2. HÀM MỚI: CHỈ LƯU CHU KỲ ---
  const handleSaveFrequencyConfig = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        const token = localStorage.getItem('iot_token');
        const tbToken = localStorage.getItem('tb_token');

        // Chỉ đóng gói Frequency để gửi đi
        const payload = {
            frequency: config.frequency
        };

        const response = await fetch(`/api/devices/${id}/config`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`, 
                'x-tb-token': tbToken               
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("Đã cập nhật chu kỳ gửi tin thành công!");
            fetchDevice();
            setShowConfigModal(false);
        } else { alert("Lỗi khi lưu chu kỳ."); }
    } catch (error) { alert("Lỗi kết nối server."); } finally { setIsSaving(false); }
  };

  // Lưu cấu hình Cảnh báo (Gửi về Server thay vì LocalStorage)
  const handleSaveAlertConfig = async (e) => {
      e.preventDefault();
      setIsSaving(true);
      try {
          // --- SỬA ĐOẠN NÀY: LẤY TOKEN VÀ GỬI KÈM HEADER ---
          const token = localStorage.getItem('iot_token');
          const tbToken = localStorage.getItem('tb_token');

          // Gọi API update config, nhưng chỉ gửi phần alert_config
          const response = await fetch(`/api/devices/${id}/config`, {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                  'x-tb-token': tbToken               // <--- QUAN TRỌNG
              },
              body: JSON.stringify({ alert_config: alertConfig })
          });
          // -------------------------------------------------

          if (response.ok) {
              alert("Đã cập nhật ngưỡng cảnh báo lên Server!");
              fetchDevice(); // Tải lại để đồng bộ
              setShowConfigModal(false);
          } else {
              alert("Lỗi khi lưu cảnh báo.");
          }
      } catch (error) {
          console.error(error);
          alert("Lỗi kết nối server.");
      } finally {
          setIsSaving(false);
      }
  };

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
      
      {/* HEADER */}
      <div className="content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div className="breadcrumb" style={{fontSize: '1.1rem', fontWeight: '500', color: '#555'}}>
            <Link to="/" style={{textDecoration: 'none', color: '#888'}}>Danh sách thiết bị</Link> 
            <span style={{margin: '0 8px'}}>/</span> 
            <span style={{color: '#007bff', fontWeight: 'bold', fontSize: '1.3rem'}}>{device.name}</span>
        </div>
        
        {/* NÚT CẤU HÌNH DUY NHẤT */}
        <div className="header-actions">
            <button 
                onClick={() => setShowConfigModal(true)} 
                style={{ 
                    backgroundColor: '#007bff', // Đổi sang màu xanh dương (Primary Blue)
                    color: 'white', 
                    border: 'none', 
                    padding: '10px 25px', 
                    borderRadius: '8px', 
                    cursor: 'pointer', 
                    fontWeight: '600', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    boxShadow: '0 4px 6px rgba(0, 123, 255, 0.3)', // Thêm bóng xanh nhẹ cho đẹp
                    transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'} // Hover đậm hơn
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}  // Trả về màu gốc
            >
                <span style={{fontSize: '1.2rem'}}>⚙️</span> Cấu hình
            </button>
        </div>
      </div>

      {/* MAIN LAYOUT (Giữ nguyên) */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch' }}>
          {/* LEFT COLUMN */}
          <div className="card" style={{ flex: '0 0 40%', marginBottom: 0 }}>
                <div className="card-header" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <h3 style={{margin: 0, fontSize: '1.1rem'}}>ℹ️ Thông tin chung</h3>
                    <div className={`status-badge ${device.status === 'active' ? 'online' : 'offline'}`} style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                        <span style={{
                            width: '8px', height: '8px', borderRadius: '50%', 
                            backgroundColor: device.status === 'active' ? '#28a745' : '#dc3545',
                            boxShadow: device.status === 'active' ? '0 0 0 rgba(40, 167, 69, 0.4)' : 'none',
                            animation: device.status === 'active' ? 'pulse-green 2s infinite' : 'none'
                        }}></span>
                        {device.status === 'active' ? 'Online' : 'Offline'}
                    </div>
                </div>
                <div className="card-body">
                    <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px'}}>
                            <span style={{color: '#666'}}>Loại thiết bị:</span><strong>{device.type}</strong>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px'}}>
                            <span style={{color: '#666'}}>ID Hệ thống:</span><strong>#{device.id}</strong>
                        </div>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                            <span style={{color: '#666'}}>ThingsBoard ID:</span>
                            <span style={{fontSize: '0.85rem', color: '#333', background: '#f1f1f1', padding: '5px', borderRadius: '4px', wordBreak: 'break-all'}}>{device.tb_device_id || 'Chưa đồng bộ'}</span>
                        </div>
                        <div style={{marginTop: '10px'}}>
                            <span style={{color: '#666', display: 'block', marginBottom: '5px'}}>Access Token:</span>
                            <div style={{display: 'flex', gap: '5px'}}>
                                <div style={{ background: '#f8f9fa', padding: '8px', borderRadius: '6px', fontFamily: 'monospace', color: '#666', flex: 1, fontSize: '1.2rem', lineHeight: '1rem', overflow: 'hidden', whiteSpace: 'nowrap' }}>•••••••••••••••</div>
                                <button onClick={copyToken} style={{ background: '#e9ecef', border: '1px solid #ced4da', borderRadius: '6px', padding: '0 15px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}>Copy</button>
                            </div>
                        </div>
                    </div>
                </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="card" style={{ flex: 1, marginBottom: 0, display: 'flex', flexDirection: 'column' }}>
                <div className="card-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <h3 style={{margin: 0, fontSize: '1.1rem'}}>📊 Giám sát dữ liệu</h3>
                    {lastUpdated && <span style={{fontSize: '0.8rem', color: '#888', fontStyle: 'italic'}}>Cập nhật: {lastUpdated.toLocaleTimeString()}</span>}
                </div>
                <div className="card-body" style={{flex: 1}}>
                    {Object.keys(telemetry).length === 0 ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', flexDirection: 'column', gap: '10px' }}><span style={{fontSize: '2rem'}}>📡</span><p>Đang chờ dữ liệu từ thiết bị...</p></div>
                    ) : (
                        <div className="telemetry-cards-container" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px'}}> 
                            {Object.entries(telemetry).map(([key, value]) => {
                                const alertInfo = getAlertStatus(key, value);
                                return (
                                    <div key={key} className="telemetry-card" style={{ padding: '25px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', backgroundColor: alertInfo.bg, border: alertInfo.status !== 'NORMAL' ? `1px solid ${alertInfo.color}` : '1px solid #eee', transition: 'all 0.3s ease' }}>
                                        <span className="telemetry-label" style={{ fontSize: '0.9rem', color: alertInfo.status !== 'NORMAL' ? alertInfo.color : '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>{key} {alertInfo.status === 'DANGER' && '⚠️'}</span>
                                        <span className="telemetry-value" style={{ fontSize: '2.5rem', fontWeight: 'bold', color: alertInfo.color }}>{value}</span>
                                        {alertInfo.msg && <span style={{fontSize: '0.8rem', color: alertInfo.color, fontWeight: '500'}}>({alertInfo.msg})</span>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
          </div>
      </div>

      {/* CSS Animation */}
      <style>{`@keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7); } 70% { box-shadow: 0 0 0 6px rgba(40, 167, 69, 0); } 100% { box-shadow: 0 0 0 0 rgba(40, 167, 69, 0); } }`}</style>

      {/* --- MODAL GỘP (TABBED MODAL) --- */}
      {showConfigModal && (
        <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '500px', padding: 0, overflow: 'hidden'}}> 
                {/* Lưu ý: Thêm padding: 0 và overflow: hidden vào modal-content để header tràn viền đẹp hơn */}
                
                {/* Header Modal - Đã chỉnh sửa căn giữa và độ cao */}
                <div className="modal-header-custom" style={{
                    borderBottom: 'none', 
                    padding: '20px 25px', // Tăng độ cao cho box (trên dưới 20px)
                    display: 'flex',      // Dùng Flexbox
                    alignItems: 'center', // Căn giữa theo chiều dọc (quan trọng)
                    justifyContent: 'space-between',
                    backgroundColor: '#87CEEB' // Màu xanh da trời như trong ảnh của bạn
                }}>
                    <h2 style={{
                        margin: 0, // Bỏ margin mặc định để không bị đẩy xuống
                        fontSize: '1.2rem', 
                        color: 'white',
                        textTransform: 'uppercase',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        ⚙️ Cấu hình Thiết bị
                    </h2>
                    <button 
                        className="modal-close-btn-custom" 
                        onClick={() => setShowConfigModal(false)}
                        style={{
                            fontSize: '1.5rem',
                            color: 'white',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            lineHeight: 1, // Giúp dấu X căn giữa chuẩn hơn
                            opacity: 0.8
                        }}
                        onMouseOver={(e) => e.target.style.opacity = 1}
                        onMouseOut={(e) => e.target.style.opacity = 0.8}
                    >×</button>
                </div>

                {/* Tabs Navigation */}
                <div style={{display: 'flex', borderBottom: '1px solid #eee', marginTop: 0, backgroundColor: 'white'}}>
                    <button onClick={() => setActiveTab('wifi')} style={{flex: 1, padding: '15px 0', background: activeTab === 'wifi' ? '#f8f9fa' : 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === 'wifi' ? '3px solid #007bff' : '3px solid transparent', color: activeTab === 'wifi' ? '#007bff' : '#666', fontWeight: '600', transition: 'all 0.2s', textAlign: 'center'}}>📡 Wifi</button>
                    <button onClick={() => setActiveTab('frequency')} style={{flex: 1, padding: '15px 0', background: activeTab === 'frequency' ? '#f8f9fa' : 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === 'frequency' ? '3px solid #17a2b8' : '3px solid transparent', color: activeTab === 'frequency' ? '#17a2b8' : '#666', fontWeight: '600', transition: 'all 0.2s', textAlign: 'center'}}>⏱️ Chu kỳ</button>
                    <button onClick={() => setActiveTab('alert')} style={{flex: 1, padding: '15px 0', background: activeTab === 'alert' ? '#f8f9fa' : 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === 'alert' ? '3px solid #ffc107' : '3px solid transparent', color: activeTab === 'alert' ? '#d39e00' : '#666', fontWeight: '600', transition: 'all 0.2s', textAlign: 'center'}}>⚠️ Cảnh báo</button>
                </div>

                {/* Tab Content */}
                <div className="modal-body-custom" style={{padding: '25px'}}>
                    
                    {/* TAB 1: WIFI - Sửa onSubmit thành handleSaveWifiConfig */}
                    {activeTab === 'wifi' && (
                        <form onSubmit={handleSaveWifiConfig}>
                            <div className="form-group"><label>Tên Wifi (SSID)</label><input type="text" name="wifi_ssid" value={config.wifi_ssid} onChange={handleConfigChange} placeholder="Nhập tên Wifi..." required /></div>
                            <div className="form-group"><label>Mật khẩu Wifi</label><input type="text" name="wifi_password" value={config.wifi_password} onChange={handleConfigChange} placeholder="Nhập mật khẩu Wifi..." /></div>
                            <div style={{marginTop: '20px', textAlign: 'right'}}>
                                <button type="submit" className="btn-submit-custom" disabled={isSaving} style={{width: '100%', backgroundColor: '#007bff'}}>LƯU CẤU HÌNH WIFI</button>
                            </div>
                        </form>
                    )}

                    {/* TAB 2: CHU KỲ - Sửa onSubmit thành handleSaveFrequencyConfig */}
                    {activeTab === 'frequency' && (
                        <form onSubmit={handleSaveFrequencyConfig}>
                            <div className="form-group"><label>Tần suất gửi dữ liệu (Giây)</label><input type="number" name="frequency" value={config.frequency} onChange={handleConfigChange} min="1" required /><small style={{display: 'block', marginTop: '5px', color: '#666'}}>Thời gian ESP32 gửi dữ liệu lên Server.</small></div>
                            <div style={{marginTop: '20px', textAlign: 'right'}}>
                                <button type="submit" className="btn-submit-custom" disabled={isSaving} style={{width: '100%', backgroundColor: '#17a2b8'}}>LƯU CHU KỲ</button>
                            </div>
                        </form>
                    )}

                    {/* TAB 3: CẢNH BÁO */}
                    {activeTab === 'alert' && (
                        <form onSubmit={handleSaveAlertConfig}>
                            <p style={{fontSize: '0.9rem', color: '#666', marginBottom: '15px'}}>Cài đặt ngưỡng để cảnh báo màu đỏ khi vượt quá giới hạn.</p>
                            
                            <div className="form-group" style={{marginBottom: '15px'}}>
                                <label style={{fontWeight: 'bold', color: '#007bff'}}>🌡️ Nhiệt độ</label>
                                <div style={{display: 'flex', gap: '10px'}}>
                                    <input type="number" value={alertConfig.temperature.min} onChange={(e) => handleAlertConfigChange('temperature', 'min', e.target.value)} placeholder="Min" style={{flex:1}} />
                                    <input type="number" value={alertConfig.temperature.max} onChange={(e) => handleAlertConfigChange('temperature', 'max', e.target.value)} placeholder="Max" style={{flex:1}} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label style={{fontWeight: 'bold', color: '#17a2b8'}}>💧 Độ ẩm</label>
                                <div style={{display: 'flex', gap: '10px'}}>
                                    <input type="number" value={alertConfig.humidity.min} onChange={(e) => handleAlertConfigChange('humidity', 'min', e.target.value)} placeholder="Min" style={{flex:1}} />
                                    <input type="number" value={alertConfig.humidity.max} onChange={(e) => handleAlertConfigChange('humidity', 'max', e.target.value)} placeholder="Max" style={{flex:1}} />
                                </div>
                            </div>
                            
                            <div style={{marginTop: '20px', textAlign: 'right'}}>
                                <button type="submit" className="btn-submit-custom" style={{width: '100%', backgroundColor: '#ffc107', color: '#333'}}>LƯU CẢNH BÁO</button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default DeviceDetailPage;