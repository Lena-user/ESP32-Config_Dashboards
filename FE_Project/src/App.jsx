import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DeviceListPage from './pages/DeviceListPage';
import DeviceDetailPage from './pages/DeviceDetailPage'; // Import trang mới

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DeviceListPage />} />
          <Route path="devices" element={<DeviceListPage />} />
          {/* Thêm route cho trang chi tiết */}
          <Route path="devices/:id" element={<DeviceDetailPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;