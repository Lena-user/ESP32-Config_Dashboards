import React, { useState, useEffect } from 'react'; // Thêm useEffect
import { Link } from 'react-router-dom';
import Modal from '../components/Modal';

function DeviceListPage() {
  const [devices, setDevices] = useState([]); // Bỏ initialMockDevices, khởi tạo mảng rỗng
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({ name: '', type: '' });
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Thêm trạng thái loading

  // 1. Hàm lấy danh sách thiết bị từ API
  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/devices');
      if (response.ok) {
        const data = await response.json();
        setDevices(data);
      } else {
        console.error("Lỗi khi tải danh sách thiết bị");
      }
    } catch (error) {
      console.error("Lỗi kết nối:", error);
    }
  };

  // Gọi API khi trang vừa load
  useEffect(() => {
    fetchDevices();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewDevice(prev => ({ ...prev, [name]: value }));
  };

  // 2. Hàm Thêm thiết bị (Gọi API ThingsBoard)
  const handleAddDevice = async (e) => {
    e.preventDefault();
    setIsLoading(true); // Bắt đầu loading
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
    } finally {
      setIsLoading(false); // Kết thúc loading
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

    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  const cancelDelete = () => {
    setIsDeleteMode(false);
    setSelectedDevices([]);
  };

  return (
    <div className="main-content">
      <div className="content-header">
        <h1>Danh Sách Thiết Bị</h1>
        <div className="header-actions">
          {isDeleteMode ? (
            <>
              <button onClick={confirmDelete} className="confirm-delete-btn" disabled={selectedDevices.length === 0 || isLoading}>
                {isLoading ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
              <button onClick={cancelDelete} className="cancel-delete-btn" disabled={isLoading}>
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
              <th>Trạng thái</th>
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
                <td>
                  <span className={`status-dot ${device.status ? device.status.toLowerCase() : 'offline'}`}></span>
                  {device.status || 'Unknown'}
                </td>
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
                <button type="submit" className="btn-submit-custom" disabled={isLoading}>
                    {isLoading ? 'ĐANG XỬ LÝ...' : 'THÊM'}
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