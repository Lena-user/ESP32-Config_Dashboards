import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function DeviceListPage() {
  const [devices, setDevices] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({ name: '', type: '' });
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  
  // Thêm state loading riêng cho việc khởi tạo
  const [isInitializing, setIsInitializing] = useState(true); 

  // Hàm lấy danh sách từ DB (Local)
  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/devices');
      const data = await response.json();
      setDevices(data);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách thiết bị:', error);
    }
  };

  // --- LOGIC MỚI: TỰ ĐỘNG ĐỒNG BỘ KHI VÀO TRANG ---
  useEffect(() => {
    const syncAndFetch = async () => {
      setIsInitializing(true); // Bắt đầu loading toàn trang
      try {
        // Bước 1: Gọi API Sync để đồng bộ Cloud -> Local
        // console.log("Đang đồng bộ dữ liệu từ ThingsBoard...");
        await fetch('/api/devices/sync', { method: 'POST' });
        
        // Bước 2: Sau khi Sync xong, mới lấy dữ liệu từ Local ra hiển thị
        await fetchDevices();
      } catch (error) {
        console.error("Lỗi đồng bộ:", error);
        // Nếu Sync lỗi (mất mạng...), vẫn cố gắng hiển thị dữ liệu cũ
        await fetchDevices(); 
      } finally {
        setIsInitializing(false); // Tắt loading
      }
    };

    syncAndFetch();
  }, []); // Chạy 1 lần duy nhất khi component được mount

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewDevice(prev => ({ ...prev, [name]: value }));
  };

  // 2. Hàm Thêm thiết bị (Gọi API ThingsBoard)
  const handleAddDevice = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/devices/thingsboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newDevice),
      });

      if (response.ok) {
        // Nếu thành công, tải lại danh sách và đóng modal
        await fetchDevices();
        setIsModalOpen(false);
        setNewDevice({ name: '', type: '' });
        alert("Thêm thiết bị thành công!");
      } else {
        const errorData = await response.json();
        alert(`Lỗi: ${errorData.error || 'Không thể thêm thiết bị'}`);
      }
    } catch (error) {
      console.error("Lỗi:", error);
      alert("Lỗi kết nối đến server");
    }
  };

  const handleSelectDevice = (deviceId) => {
    setSelectedDevices(prevSelected =>
      prevSelected.includes(deviceId)
        ? prevSelected.filter(id => id !== deviceId)
        : [...prevSelected, deviceId]
    );
  };

  // 3. Hàm Xóa thiết bị (Gọi API Delete)
  const confirmDelete = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa các thiết bị đã chọn?")) return;

    try {
      // Xóa từng thiết bị một (Backend của bạn API xóa theo từng ID)
      // Sử dụng Promise.all để xóa song song cho nhanh
      await Promise.all(selectedDevices.map(id => 
        fetch(`/api/devices/${id}`, { method: 'DELETE' })
      ));

      // Sau khi xóa xong, tải lại danh sách
      await fetchDevices();
      
      setIsDeleteMode(false);
      setSelectedDevices([]);
      alert("Đã xóa thành công!");

    } catch (error) {
      console.error("Lỗi khi xóa:", error);
      alert("Có lỗi xảy ra khi xóa thiết bị.");
    }
  };

  const cancelDelete = () => {
    setIsDeleteMode(false);
    setSelectedDevices([]);
  };

  // Nếu đang đồng bộ lần đầu, hiện màn hình chờ
  if (isInitializing) {
      return (
          <div style={{textAlign: 'center', marginTop: '50px', color: '#666'}}>
              <h2>⏳ Đang đồng bộ dữ liệu từ Cloud...</h2>
              <p>Vui lòng đợi trong giây lát</p>
          </div>
      );
  }

  return (
    <div className="main-content">
      <div className="content-header">
        <h1>Danh Sách Thiết Bị</h1>
        <div className="header-actions">
          {isDeleteMode ? (
            <>
              <button onClick={confirmDelete} className="confirm-delete-btn" disabled={selectedDevices.length === 0}>
                Xác nhận xóa
              </button>
              <button onClick={cancelDelete} className="cancel-delete-btn">
                Hủy
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsModalOpen(true)} className="add-device-btn">
                + Thêm thiết bị mới
              </button>
              <button onClick={() => setIsDeleteMode(true)} className="delete-mode-btn">
                - Xóa thiết bị
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="device-list">
        {devices.length === 0 ? (
            <p style={{textAlign: 'center', padding: '20px'}}>Chưa có thiết bị nào.</p>
        ) : (
        <table>
          <thead>
            <tr>
              {isDeleteMode && <th></th>}
              <th>Tên thiết bị</th>
              <th>Loại</th>
              
              {/* --- SỬA ĐỔI PHẦN TRẠNG THÁI TẠI ĐÂY --- */}
              <th>Trạng thái</th>
              {/* --------------------------------------- */}

              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {devices.map(device => (
              <tr key={device.id} className={selectedDevices.includes(device.id) ? 'selected' : ''}>
                {isDeleteMode && (
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedDevices.includes(device.id)}
                      onChange={() => handleSelectDevice(device.id)}
                    />
                  </td>
                )}
                <td>{device.name}</td>
                <td>{device.type}</td>
                
                {/* --- SỬA ĐỔI PHẦN TRẠNG THÁI TẠI ĐÂY --- */}
                <td>
                  <div className="status-cell">
                    {/* Logic: Nếu status là 'active' thì dùng class 'online' (xanh), ngược lại 'offline' (đỏ) */}
                    <span className={`status-dot ${device.status === 'active' ? 'online' : 'offline'}`}></span>
                    
                    {/* Hiển thị text */}
                    <span style={{textTransform: 'capitalize'}}>
                        {device.status === 'active' ? 'Hoạt động' : 'Mất kết nối'}
                    </span>
                  </div>
                </td>
                {/* --------------------------------------- */}

                <td>
                  <Link to={`/devices/${device.id}`} className="action-link">
                    Xem chi tiết
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>

      {/* MODAL MỚI ĐƯỢC TÙY BIẾN */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            
            {/* Header màu XANH với icon dấu CỘNG */}
            <div className="modal-header-custom">
              {/* Thay icon 💬 thành dấu + lớn */}
              <h2><span style={{fontSize: '1.5rem', fontWeight: 'bold'}}>+</span> THÊM THIẾT BỊ</h2>
              <button className="modal-close-btn-custom" onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleAddDevice}>
              <div className="modal-body-custom">
                <div className="form-group">
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={newDevice.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Tên thiết bị"
                  />
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    id="type"
                    name="type"
                    value={newDevice.type}
                    onChange={handleInputChange}
                    required
                    placeholder="Loại thiết bị"
                  />
                </div>
              </div>

              <div className="modal-footer-custom">
                <button type="submit" className="btn-submit-custom">
                    THÊM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeviceListPage;