import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import tellux from 'tellux'
import type { ViewerClickEvent } from 'tellux'

const ION_TOKEN = import.meta.env.VITE_CESIUM_ION_TOKEN || "填入你的Token"
const GOOGLE_PHOTOREALISTIC_ASSET_ID = 2275207
const OSM_ASSET_ID = "96188"

export default function CitizenReport() {
  const [reportText, setReportText] = useState('')
  // 新增聯絡資訊的 State
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  // 預設為康塞普西翁市區中心
  const [latitude, setLatitude] = useState(-36.827063)
  const [longitude, setLongitude] = useState(-73.050201)
  const [category, setCategory] = useState('Roads & Infrastructure') // 預設類別
  const [isUrgentPolice, setIsUrgentPolice] = useState(false) // 是否同步通報警局
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let viewer: any = null
    let isCancelled = false

    async function initMiniMap() {
      if (!mapContainerRef.current) return
      mapContainerRef.current.innerHTML = ''

      try {
        viewer = await tellux.Viewer.create(mapContainerRef.current, {
          renderer: { type: "webgl" },
          camera: {
            destination: { longitude: -73.050201, latitude: -36.827063, height: 1500 },
            orientation: { heading: 0, pitch: -45, roll: 0 }
          },
          scene: {
            atmosphere: {
              show: true,
              lighting: {
                mode: "post-process",
                sunLight: true,
                skyLight: true
              }
            },
          },
          widgets: { timeline: false }
        })

        if (isCancelled) {
          viewer.destroy()
          return
        }

        viewer.globe.show = true
        viewerRef.current = viewer

        if (ION_TOKEN) {
          // 載入 Google 底圖
          viewer.tilesets.add({
            source: { type: "cesium-ion", assetId: GOOGLE_PHOTOREALISTIC_ASSET_ID, apiToken: ION_TOKEN },
            id: "google-base",
            creasedNormals: true,
          })
        }

        // 監聽點擊事件：直接從 3D Tiles feature 抓取經緯度
        const handleClick = (event: ViewerClickEvent) => {
          const pick = event.pick
          const feature = (pick as any)?.type === "tilesFeature" ? (pick as any).feature : null

          if (feature && feature.cartographic) {
            const lon = feature.cartographic.longitude
            const lat = feature.cartographic.latitude

            setLongitude(Number(lon.toFixed(6)))
            setLatitude(Number(lat.toFixed(6)))

            // 清除舊標記並加上新點擊的紅點
            viewer.entities.removeAll()
            viewer.entities.add({
              id: 'selected-location',
              position: [lon, lat, 50],
              point: {
                color: "#ef4444",
                pixelSize: 20,
                outlineColor: "#ffffff",
                outlineWidth: 2,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
              } as any
            })
          }
        }

        viewer.on("click", handleClick)
        ;(viewer as any)._cleanup = () => {
          viewer.off("click", handleClick)
        }

      } catch (e) {
        console.error("Mini map init failed:", e)
      }
    }

    initMiniMap()

    return () => {
      isCancelled = true
      if (viewerRef.current) {
        if (viewerRef.current._cleanup) viewerRef.current._cleanup()
        viewerRef.current.destroy()
        viewerRef.current = null
      }
    }
  }, [])

  const handleSubmit = () => {
    if (!reportText) return alert("Please key in your statement.")
    if (!latitude || !longitude) return alert("Please select a location on the map.")

    const newReport = {
      id: Date.now().toString(),
      name: name || 'Anonymous', // 儲存姓名，若沒填則預設匿名
      phone: phone || 'N/A',     // 儲存電話
      email: email || 'N/A',     // 儲存 Email
      category: category,
      isUrgentPolice: isUrgentPolice,
      text: reportText,
      lat: latitude,
      lon: longitude,
      status: 'pending',
      time: new Date().toLocaleString()
    }

    const existingReports = JSON.parse(localStorage.getItem('reports') || '[]')
    localStorage.setItem('reports', JSON.stringify([...existingReports, newReport]))

    alert("Report successful! Moving to dashboard.")
    navigate('/dashboard')
  }

  return (
    <div style={{ backgroundColor: '#ffffff', height: '100%', width: '100%', padding: '20px', boxSizing: 'border-box', overflowY: 'auto' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif', color: '#111827', paddingBottom: '40px' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '16px', color: '#111827' }}>Citizen Reporting System</h1>
        
        {/* 聯絡資訊填寫欄位 (姓名、電話、Email) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: '#4b5563' }}>Name</label>
            <input 
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: '#4b5563' }}>Phone</label>
            <input 
              type="tel"
              placeholder="Your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: '#4b5563' }}>Email</label>
          <input 
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        {/* 嵌入式小地圖區塊 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: '#4b5563', fontWeight: 'bold' }}>
            📍 Click on any building/location on the map to set coordinates:
          </label>
          <div 
            ref={mapContainerRef} 
            style={{ width: '100%', height: '320px', borderRadius: '8px', border: '1px solid #ccc', overflow: 'hidden' }} 
          />
        </div>

        {/* 經緯度顯示與手動微調區塊 */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: '#4b5563' }}>Latitude</label>
            <input 
              type="number" 
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(parseFloat(e.target.value))}
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: '#4b5563' }}>Longitude</label>
            <input 
              type="number" 
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(parseFloat(e.target.value))}
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
        </div>

        {/* 案件類別下拉選單 */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: '#4b5563' }}>Category</label>
          <select 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#f9fafb', color: '#111827' }}
          >
            <option value="Roads & Infrastructure">Roads & Infrastructure</option>
            <option value="Lighting & Utilities">Lighting & Utilities</option>
            <option value="Environment & Sanitation">Environment & Sanitation</option>
            <option value="Public Safety">Public Safety</option>
            <option value="Fire & Disaster Prevention">Fire & Disaster Prevention</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* 內容輸入區塊 */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: '#4b5563' }}>Statement</label>
          <textarea 
            rows={4} 
            style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} 
            placeholder="E.g. lamp malfunction, road damaged..."
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
          />
        </div>

        {/* 勾選框：立即通報警察局 / 相關應變單位 */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '25px', gap: '8px' }}>
          <input 
            type="checkbox" 
            id="policeCheckbox"
            checked={isUrgentPolice}
            onChange={(e) => setIsUrgentPolice(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <label htmlFor="policeCheckbox" style={{ fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
            🚨 Immediately notify police / relevant emergency response units
          </label>
        </div>

        <button 
          onClick={handleSubmit} 
          style={{ width: '100%', padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
        >
          Send Report
        </button>
      </div>
    </div>
  )
}