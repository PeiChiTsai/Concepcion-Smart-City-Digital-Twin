import React, { useEffect, useRef, useState } from 'react'
import tellux from 'tellux'
import type { ViewerMouseMoveEvent, ViewerClickEvent, Picked3DTilesFeature } from 'tellux'
import * as THREE from 'three'

const ION_TOKEN = import.meta.env.VITE_CESIUM_ION_TOKEN || "填入你的Token"
const OSM_ASSET_ID = "96188" 
const GOOGLE_PHOTOREALISTIC_ASSET_ID = 2275207

const CAMERA_VIEW = {
  latitude: -36.827063,
  longitude: -73.050201,
  height: 800,
  heading: 0,
  pitch: -45.00,
  roll: 0,
}

// 輔助函式：取得建築物名稱
function getFeatureName(feature: Picked3DTilesFeature) {
  const props = feature.properties
  for (const key of ["name", "Name", "NAME"]) {
    if (props[key]) return String(props[key])
  }
  return `OSM building ID: ${feature.featureId ?? "unknown"}`
}

export default function TelluxMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<InstanceType<typeof tellux.Viewer> | null>(null)

  const [hoverInfo, setHoverInfo] = useState({ visible: false, x: 0, y: 0, text: "" })
  const [popupFeature, setPopupFeature] = useState<Picked3DTilesFeature | null>(null)
  
  // 新增：用來記錄目前點擊到的民眾通報資料
  const [popupReport, setPopupReport] = useState<{ text: string, time: string } | null>(null)

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return

    const viewer = new tellux.Viewer(containerRef.current, {
      clock: { currentTime: new Date("2024-01-01T14:00:00Z") },
      camera: {
        destination: { longitude: CAMERA_VIEW.longitude, latitude: CAMERA_VIEW.latitude, height: CAMERA_VIEW.height },
        orientation: { heading: CAMERA_VIEW.heading, pitch: CAMERA_VIEW.pitch, roll: CAMERA_VIEW.roll },
      },
highlighter: {
        overlay: {
          enabled: true, // 确保启用[cite: 1]
          color: '#7cff5b', // 绿色选中[cite: 1]
          opacity: 0.58, // 选中时的透明度[cite: 1]
          hoverColor: '#38bdf8', // 蓝色悬停[cite: 1]
          hoverOpacity: 0.42 // 悬停时的透明度[cite: 1]
        }
      },
      scene: {
        atmosphere: { lighting: { mode: "post-process", sunLight: true, skyLight: true } },
        clouds: { show: true, quality: "ultra" },
      },
    })
    
    viewer.globe.show = false
    viewerRef.current = viewer

    if (ION_TOKEN) {
      viewer.tilesets.add({
        source: { type: "cesium-ion", assetId: GOOGLE_PHOTOREALISTIC_ASSET_ID, apiToken: ION_TOKEN },
        id: "google-photorealistic-3d-tiles",
        creasedNormals: true,
      })
// 1. 載入 OSM 建築
      const osmLayer = viewer.tilesets.add({
        source: { type: "cesium-ion", assetId: OSM_ASSET_ID, apiToken: ION_TOKEN },
        id: "osm-buildings",
      })

;(osmLayer.tileset as any).addEventListener("load-model", (event: any) => {
        event.scene.traverse((child: any) => {
          if (child.isMesh && child.material) {
            child.material.color.setHex(0xdc2626) 
            child.material.transparent = true     
            child.material.opacity = 0.5          
            
            // 【關鍵魔法】：關閉深度寫入與深度測試
            child.material.depthWrite = false 
            child.material.depthTest = false // 讓它無視前方是否有 Google 建築遮擋
            
            // 強制設定渲染順序，確保它在最後才被畫上去 (畫在最上層)
            child.renderOrder = 999 
            
            child.material.needsUpdate = true     
          }
        })
      })
    }

    // 繪製紅點
    const reports = JSON.parse(localStorage.getItem('reports') || '[]')
    reports.forEach((report: any) => {
      viewer.entities.add({
        id: `report-${report.id}`,
        position: [report.lon, report.lat, 80],
        point: {
          color: "#ef4444", 
          pixelSize: 24,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        } as any,
        properties: {
          isReport: true,
          text: report.text,
          time: report.time
        }
      })
    })

    const handleMouseMove = (event: ViewerMouseMoveEvent) => {
      const pick = event.pick
      if (!pick) {
        setHoverInfo(prev => ({ ...prev, visible: false }))
        viewer.highlighter.setHover(null as any)
        return
      }
      // 【根據 Console 真實資料抓取 ID】真正的 Entity 被包了兩層
      let entityId = ""
      const rawPick = pick as any
      
      if (rawPick.type === "entity" && rawPick.entity && rawPick.entity.entity) {
        // 往下挖兩層，拿到真實的 Cesium Entity (即 Console 裡的 Rd)
        const realEntity = rawPick.entity.entity
        entityId = typeof realEntity.id === "string" ? realEntity.id : ""
      }

      // 1. 判斷是否碰到紅點
      if (entityId.startsWith('report-')) {
        setHoverInfo({
          visible: true,
          x: event.position.x + 15,
          y: event.position.y + 15,
          text: "民眾通報 (點擊查看)"
        })
        viewer.highlighter.setHover(null as any) // 碰到紅點時，取消建築物高亮
        return
      }

      // 2. 原本的 OSM 建築物邏輯
      const feature = (pick as any).type === "tilesFeature" ? (pick as any).feature : null
      if (feature && feature.layerId === "osm-buildings") {
        setHoverInfo({
          visible: true,
          x: event.position.x + 15,
          y: event.position.y + 15,
          text: getFeatureName(feature)
        })
        viewer.highlighter.setHover(pick!)
      } else {
        setHoverInfo(prev => ({ ...prev, visible: false }))
        viewer.highlighter.setHover(null as any)
      }
    }

    const handleClick = (event: ViewerClickEvent) => {
      const pick = event.pick
      if (!pick) {
        setPopupFeature(null)
        setPopupReport(null)
        viewer.highlighter.clear()
        return
      }

// 幫你在 Console 印出真正的底層資料，可以按 F12 看看它到底長怎樣
      console.log("真實的點擊資料:", pick)

// 【根據 Console 真實資料抓取 ID】真正的 Entity 被包了兩層
      let entityId = ""
      const rawPick = pick as any
      
      if (rawPick.type === "entity" && rawPick.entity && rawPick.entity.entity) {
        // 往下挖兩層，拿到真實的 Cesium Entity (即 Console 裡的 Rd)
        const realEntity = rawPick.entity.entity
        entityId = typeof realEntity.id === "string" ? realEntity.id : ""
      }
      
      // 1. 判斷是否點擊到紅點
      if (entityId.startsWith('report-')) {
        const reportId = entityId.replace('report-', '')
        const targetReport = reports.find((r: any) => String(r.id) === reportId)

        if (targetReport) {
          setPopupReport({ 
            text: targetReport.text || "無詳細內容", 
            time: targetReport.time || "未知時間" 
          })
          setPopupFeature(null) 
          viewer.highlighter.clear()
          return
        }
      }

      // 2. 判斷是否點擊到 OSM 建築物
      const feature = (pick as any).type === "tilesFeature" ? (pick as any).feature : null
      if (feature && feature.layerId === "osm-buildings") {
        viewer.highlighter.set(pick!)
        setPopupFeature(feature)
        setPopupReport(null) 
      } else {
        setPopupFeature(null)
        setPopupReport(null)
        viewer.highlighter.clear()
      }
    }

    viewer.on("mousemove", handleMouseMove)
    viewer.on("click", handleClick)

    return () => {
      viewer.off("mousemove", handleMouseMove)
      viewer.off("click", handleClick)
      viewer.destroy()
      viewerRef.current = null
    }
  }, []) 

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {hoverInfo.visible && (
        <div style={{
          position: "absolute", left: hoverInfo.x, top: hoverInfo.y,
          background: "rgba(0, 0, 0, 0.8)", color: "white", padding: "4px 8px",
          borderRadius: "4px", pointerEvents: "none", fontSize: "14px", zIndex: 10
        }}>
          {hoverInfo.text}
        </div>
      )}

      {/* 建築物屬性面板 */}
      {popupFeature && (
        <div style={{
          position: "absolute", top: 20, right: 20,
          background: "rgba(20, 20, 20, 0.9)", color: "white", padding: "16px",
          borderRadius: "8px", border: "1px solid #444", maxHeight: "80vh", overflowY: "auto", zIndex: 10
        }}>
          <h2 style={{ marginTop: 0, fontSize: "18px" }}>{getFeatureName(popupFeature)}</h2>
          <p style={{ fontSize: "12px", color: "#aaa" }}>
            Longitude: {popupFeature.cartographic.longitude.toFixed(5)}<br />
            Latitude: {popupFeature.cartographic.latitude.toFixed(5)}
          </p>
          <table style={{ textAlign: "left", borderCollapse: "collapse", fontSize: "14px", width: "100%" }}>
            <tbody>
              {Object.entries(popupFeature.properties).slice(0, 10).map(([key, value]) => (
                <tr key={key}>
                  <th style={{ padding: "4px", borderBottom: "1px solid #444" }}>{key}</th>
                  <td style={{ padding: "4px", borderBottom: "1px solid #444" }}>{String(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 新增：民眾通報面板 (紅色系，以便與建築物面板區分) */}
      {popupReport && (
        <div style={{
          position: "absolute", top: 20, right: 20,
          background: "rgba(220, 38, 38, 0.9)", color: "white", padding: "16px",
          borderRadius: "8px", border: "1px solid #ef4444", minWidth: "250px", zIndex: 10,
          boxShadow: "0 4px 6px rgba(0,0,0,0.3)"
        }}>
          <h2 style={{ marginTop: 0, fontSize: "18px", borderBottom: "1px solid rgba(255,255,255,0.3)", paddingBottom: "8px" }}>
            🚨 Citizen Reported Case
          </h2>
          <div style={{ fontSize: "14px", marginTop: "12px" }}>
            <p style={{ margin: "4px 0" }}><strong>Report Time:</strong> {popupReport.time}</p>
            <p style={{ margin: "4px 0" }}><strong>Content:</strong></p>
            <p style={{ margin: "4px 0", padding: "8px", background: "rgba(0,0,0,0.2)", borderRadius: "4px" }}>
              {popupReport.text}
            </p>
          </div>
          <button 
            onClick={() => setPopupReport(null)}
            style={{ 
              marginTop: "16px", width: "100%", padding: "8px", 
              background: "white", color: "#dc2626", border: "none", 
              borderRadius: "4px", cursor: "pointer", fontWeight: "bold" 
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}