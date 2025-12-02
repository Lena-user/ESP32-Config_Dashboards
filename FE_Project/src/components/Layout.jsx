import React from 'react';
import Header from './Header'; 
import { Outlet } from 'react-router-dom';
import Footer from './Footer';

// Nhận props user và onLogout từ App
function Layout({ user, onLogout }) {
  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header user={user} onLogout={onLogout} />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default Layout;