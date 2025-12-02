import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import DeviceListPage from './pages/DeviceListPage';
import DeviceDetailPage from './pages/DeviceDetailPage';
import LoginModal from './components/LoginModal'; // Import Modal mới
import Header from './components/Header';
import Footer from './components/Footer';

// Component Landing Page đơn giản (Tối giản)
const LandingPage = () => (
    <div style={{
        textAlign: 'center', 
        padding: '100px 20px', 
        background: 'linear-gradient(180deg, #f4f7f6 0%, #ffffff 100%)',
        flex: 1
    }}>
        <h1 style={{fontSize: '3rem', color: '#333', marginBottom: '20px'}}>Quản Lý IoT Thông Minh</h1>
        <p style={{fontSize: '1.2rem', color: '#666', maxWidth: '600px', margin: '0 auto'}}>
            Hệ thống giám sát và cấu hình thiết bị ESP32 từ xa. 
            <br/>Đăng nhập để bắt đầu quản lý thiết bị của bạn.
        </p>
        <div style={{marginTop: '50px', fontSize: '5rem'}}>🚀</div>
    </div>
);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) return null;

  return (
    <Router>
      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        
        {/* Header luôn hiển thị, truyền hàm mở Modal */}
        <Header 
            user={user} 
            onLogout={handleLogout} 
            onOpenLogin={() => setShowLoginModal(true)} 
        />

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {user ? (
                // --- KHU VỰC ĐÃ ĐĂNG NHẬP ---
                <Routes>
                    <Route path="/" element={<DeviceListPage />} />
                    <Route path="/devices" element={<DeviceListPage />} />
                    <Route path="/devices/:id" element={<DeviceDetailPage />} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            ) : (
                // --- KHU VỰC CHƯA ĐĂNG NHẬP (Landing Page) ---
                <LandingPage />
            )}
        </main>

        <Footer />

        {/* Modal Login nằm đè lên tất cả */}
        <LoginModal 
            isOpen={showLoginModal} 
            onClose={() => setShowLoginModal(false)} 
            onLoginSuccess={handleLoginSuccess} 
        />
      </div>
    </Router>
  );
}

export default App;