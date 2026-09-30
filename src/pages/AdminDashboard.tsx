import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function AdminDashboard() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // 1. 載入所有通報資料
  const fetchReports = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('id', { ascending: false }) // 最新建立的排在最前面

    if (error) {
      console.error("載入失敗:", error)
    } else {
      setReports(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchReports()
  }, [])

  // 2. 更新通報狀態 (例如從 pending 改成 resolved)
  const handleStatusChange = async (id: number, newStatus: string) => {
    const { error } = await supabase
      .from('reports')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      alert("更新狀態失敗")
    } else {
      // 重新整理列表
      fetchReports()
    }
  }

  // 3. 刪除通報
  const handleDelete = async (id: number) => {
    if (!window.confirm("確定要刪除這筆通報嗎？")) return

    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id)

    if (error) {
      alert("刪除失敗")
    } else {
      fetchReports()
    }
  }

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '20px' }}>
          🛠️ 市政管理者後台 (Admin Dashboard)
        </h1>

        {loading ? (
          <p>載入中...</p>
        ) : (
          <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#e5e7eb', color: '#374151', borderBottom: '1px solid #d1d5db' }}>
                  <th style={{ padding: '12px' }}>ID</th>
                  <th style={{ padding: '12px' }}>時間 / 類別</th>
                  <th style={{ padding: '12px' }}>通報人</th>
                  <th style={{ padding: '12px' }}>內容描述</th>
                  <th style={{ padding: '12px' }}>狀態</th>
                  <th style={{ padding: '12px' }}>動作</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>目前沒有任何市民通報</td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr key={report.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>#{report.id}</td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{report.time}</div>
                        <div style={{ fontWeight: '500', color: '#2563eb' }}>{report.category}</div>
                        {report.is_urgent_police && (
                          <span style={{ background: '#fee2e2', color: '#991b1b', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>🚨 緊急警局通報</span>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div>{report.name}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{report.phone}</div>
                      </td>
                      <td style={{ padding: '12px', maxWidth: '300px', wordBreak: 'break-word' }}>
                        {report.text}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <select 
                          value={report.status || 'pending'} 
                          onChange={(e) => handleStatusChange(report.id, e.target.value)}
                          style={{ padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db', background: '#f9fafb' }}
                        >
                          <option value="pending">Pending (處理中)</option>
                          <option value="in-progress">In Progress (進行中)</option>
                          <option value="resolved">Resolved (已結案)</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button 
                          onClick={() => handleDelete(report.id)}
                          style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          刪除
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}