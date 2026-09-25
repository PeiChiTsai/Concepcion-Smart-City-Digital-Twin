import React from 'react'
import { TelluxMap } from '../TelluxMap'

export default function GovDashboard() {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* 這是市府端的第二層頂部列 (Dashboard 標題) */}
      <div style={{ 
        background: '#1e293b', 
        color: 'white', 
        padding: '10px 20px', 
        flexShrink: 0,
        display: 'flex',                 // 新增：設定為 flex 容器
        justifyContent: 'space-between', // 新增：讓子元素分別靠左右對齊
        alignItems: 'center'             // 新增：垂直置中對齊
      }}>
        
        {/* 用 span 把文字包起來，方便排版與調整字體 */}
        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
          Concepcion Smart City Digital Twin Dashboard
        </span>
        
        <button 
          onClick={() => {
            if(window.confirm("確定要清空所有通報資料嗎？")) {
              localStorage.removeItem('reports')
              alert("資料已清空！")
              window.location.reload() // 重新整理頁面
            }
          }} 
          style={{ 
            // 移除了 width: '100%' 與 marginTop: '10px'
            padding: '8px 16px', // 稍微縮小 padding 讓按鈕看起來更精緻
            background: '#ef4444', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px', 
            cursor: 'pointer', 
            fontSize: '14px', 
            fontWeight: 'bold',
            whiteSpace: 'nowrap' // 確保按鈕文字不會換行
          }}
        >
          Clean all data
        </button>
      </div>
      
      {/* 地圖區塊：自動填滿剩下的所有空間 */}
      <div style={{ flex: 1, position: 'relative' }}>
        <TelluxMap />
      </div>
    </div>
  )
}