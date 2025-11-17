import React from 'react';
import Header from './Header'; 
import { Outlet } from 'react-router-dom';
import Footer from './Footer';

function Layout({ children }) {
  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default Layout;