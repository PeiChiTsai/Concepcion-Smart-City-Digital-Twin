import React from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import CitizenReport from './pages/CitizenReport'
import GovDashboard from './pages/GovDashboard'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      {/* 最外層加上 Flex 排版，讓它佔滿整個畫面 */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
        
        {/* 這條導覽列會固定在最上面 */}
        <nav style={{ background: '#f3f4f6', padding: '10px 20px', borderBottom: '1px solid #ccc', flexShrink: 0 }}>
          <span style={{ fontWeight: 'bold', marginRight: '20px' }}>Change Role:</span>
          <Link to="/report" style={{ marginRight: '15px', color: '#2563eb', textDecoration: 'none' }}>Citizen (Report)</Link>
          <Link to="/dashboard" style={{ color: '#059669', textDecoration: 'none' }}>Municipality (Management)</Link>

        </nav>

        {/* 這裡面的內容會自動填滿剩餘的空間 */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <Routes>
            <Route path="/" element={<CitizenReport />} />
            <Route path="/report" element={<CitizenReport />} />
            <Route path="/dashboard" element={<GovDashboard />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}