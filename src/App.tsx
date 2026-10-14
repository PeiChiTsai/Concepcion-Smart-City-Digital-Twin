import React from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import CitizenReport from './pages/CitizenReport'
import CitizenReportChat from './pages/CitizenReport_Chat'
import GovDashboard from './pages/GovDashboard'
import AdminDashboard from './pages/AdminDashboard'
export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      {/* 最外層加上 Flex 排版，讓它佔滿整個畫面 */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
        
        {/* 這條導覽列會固定在最上面 */}
        <nav style={{ position: 'relative', zIndex: 20, background: '#f3f4f6', padding: 'calc(10px + env(safe-area-inset-top, 0px)) 20px 10px', borderBottom: '1px solid #ccc', flexShrink: 0 }}>
          <span style={{ fontWeight: 'bold', marginRight: '20px' }}>Change Role:</span>
          <Link to="/report" style={{ marginRight: '15px', color: '#2563eb', textDecoration: 'none' }}>Citizen (Report)</Link>
          <Link to="/report-chat" style={{ marginRight: '15px', color: '#2563eb', textDecoration: 'none' }}>Citizen (Chat)</Link>
          <Link to="/dashboard" style={{ color: '#059669', textDecoration: 'none' }}>3D Map</Link>
          <Link to="/admin" style={{ marginLeft: '15px', color: '#b91c1c', textDecoration: 'none' }}>Admin Dashboard (Management)</Link>
        </nav>

        {/* 這裡面的內容會自動填滿剩餘的空間 */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
          <Routes>
            <Route path="/" element={<CitizenReport />} />
            <Route path="/report" element={<CitizenReport />} />
            <Route path="/report-chat" element={<CitizenReportChat />} />
            <Route path="/dashboard" element={<GovDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}