import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../components/Modal';

function DeviceListPage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({ name: '', type: '' });
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [isDeleteMode, setIsDeleteMode] = useState(false); // State mới để quản lý chế độ xóa

  useEffect(() => {
    fetch('/api/devices')
      .then(res => res.json())
      .then(data => {
        setDevices(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch devices:", err);
        setLoading(false);
      });
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewDevice(prev => ({ ...prev, [name]: value }));
  };

  const handleAddDevice = (e) => {
    e.preventDefault();
    const deviceToAdd = { ...newDevice, id: `new-device-${Date.now()}`, status: 'Online' };
    setDevices(prev => [...prev, deviceToAdd]);
    setIsModalOpen(false);
    setNewDevice({ name: '', type: '' });
  };

  const handleSelectDevice = (deviceId) => {
    setSelectedDevices(prevSelected =>
      prevSelected.includes(deviceId)
        ? prevSelected.filter(id => id !== deviceId)
        : [...prevSelected, deviceId]
    );
  };

  // Hàm xác nhận xóa
  const confirmDelete = () => {
    // Bỏ qua hộp thoại xác nhận, xóa trực tiếp
    setDevices(prevDevices =>
      prevDevices.filter(device => !selectedDevices.includes(device.id))
    );
    setIsDeleteMode(false); // Thoát chế độ xóa
    setSelectedDevices([]); // Reset lựa chọn
  };

  // Hàm hủy chế độ xóa
  const cancelDelete = () => {
    setIsDeleteMode(false);
    setSelectedDevices([]);
  };

  if (loading) {
    return <div>Loading devices...</div>;
  }

  return (
    <div className="main-content">
      <div className="content-header">
        <h1>Danh Sách Thiết Bị</h1>
        <div className="header-actions">
          {isDeleteMode ? (
            // Các nút khi ở chế độ xóa
            <>
              <button onClick={confirmDelete} className="confirm-delete-btn" disabled={selectedDevices.length === 0}>
                Xác nhận xóa
              </button>
              <button onClick={cancelDelete} className="cancel-delete-btn">
                Hủy
              </button>
            </>
          ) : (
            // Các nút mặc định
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
        <table>
          <thead>
            <tr>
              {isDeleteMode && <th></th>} {/* Chỉ hiện cột checkbox khi ở chế độ xóa */}
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
                  <span className={`status-dot ${device.status.toLowerCase()}`}></span>
                  {device.status}
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
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Thêm thiết bị mới">
        <form onSubmit={handleAddDevice}>
          <div className="form-group">
            <label htmlFor="name">Tên thiết bị</label>
            <input
              type="text"
              id="name"
              name="name"
              value={newDevice.name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="type">Loại thiết bị</label>
            <input
              type="text"
              id="type"
              name="type"
              value={newDevice.type}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary">Thêm</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default DeviceListPage;