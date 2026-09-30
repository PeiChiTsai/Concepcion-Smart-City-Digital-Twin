import React, { useEffect, useRef, useState } from 'react'
import tellux from 'tellux'
import * as Cesium from 'cesium'
import type { ViewerMouseMoveEvent, ViewerClickEvent, Picked3DTilesFeature } from 'tellux'
import { supabase } from './supabaseClient' 

const ION_TOKEN = import.meta.env.VITE_CESIUM_ION_TOKEN || "填入你的Token"
//OSM_ASSET_ID = 96188
//Concepcion_3D_Tiles = 5950827
const OSM_ASSET_ID = 5950827
//Google_Maps_2D_Roadmap = 3830184
//GOOGLE_MAPS_2D_SATELLITE_ASSET_ID = 3830182
const GOOGLE_PHOTOREALISTIC_ASSET_ID = 2275207
const GOOGLE_MAPS_2D_SATELLITE_ASSET_ID = 3830182

// ...exist
const CAMERA_VIEW = {
  latitude: -36.827063,
  longitude: -73.050201,
  height: 800,
  heading: 0,
  pitch: -45.00,
  roll: 0,
}

// 如果太陽光影與當地時間有時差，可以在這裡調整小時加減（例如 +3 代表將時鐘往後撥 3 小時）
const TIME_OFFSET_HOURS = 0

function getFeatureName(feature: Picked3DTilesFeature) {
  const props = feature.properties

  for (const key of ["name", "Name", "NAME"]) {
    if (props[key]) return String(props[key])
  }

  return `OSM building ID: ${feature.featureId ?? "unknown"}`
}

export const TelluxMap: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)

  const [hoverInfo, setHoverInfo] = useState({
    visible: false,
    x: 0,
    y: 0,
    text: ""
  })

  const [popupFeature, setPopupFeature] =
    useState<Picked3DTilesFeature | null>(null)

  const [popupReport, setPopupReport] = useState<{
    text: string
    time: string
    category?: string
    isUrgentPolice?: boolean
    name?: string
    phone?: string
    email?: string
  } | null>(null)

  useEffect(() => {
    let viewer: any = null
    let isCancelled = false

    async function initViewer() {
      if (!containerRef.current) return

      // 【關鍵修復】每次初始化前清空容器，
      // 防止 Vite HMR 熱更新或重整時 WebGPU Context 衝突卡死
      containerRef.current.innerHTML = ''

      try {
        viewer = await tellux.Viewer.create(containerRef.current, {
          renderer: { type: "webgl" },

          camera: {
            destination: {
              longitude: CAMERA_VIEW.longitude,
              latitude: CAMERA_VIEW.latitude,
              height: CAMERA_VIEW.height
            },

            orientation: {
              heading: CAMERA_VIEW.heading,
              pitch: CAMERA_VIEW.pitch,
              roll: CAMERA_VIEW.roll
            },
          },

          highlighter: {
            overlay: {
              enabled: true,
              color: '#7cff5b',
              opacity: 0.58,
              hoverColor: '#38bdf8',
              hoverOpacity: 0.42
            }
          },

          scene: {
            atmosphere: {
              show: true,
              lighting: {
                mode: "light-source",
                sunLight: true,
                skyLight: true
              }
            },

            clouds: {
              show: true,
              quality: "ultra"
            },
          },

          postProcess: {
            toneMapping: {
              exposure: 5
            }
          },

          widgets: {
            timeline: true
          }
        })

        if (isCancelled) {
          viewer.destroy()
          return
        }

        viewer.globe.show = true
        viewerRef.current = viewer
// 【時差調整邏輯】當內建 Widget 改變時間時，將時鐘套用 TIME_OFFSET_HOURS
        if (TIME_OFFSET_HOURS !== 0 && viewer.clock) {
          let isUpdating = false
          viewer.clock.onTick?.addEventListener(() => {
            if (isUpdating) return
            isUpdating = true
            const currentTime = new Date(viewer.clock.currentTime)
            const adjustedTime = new Date(currentTime.getTime() + TIME_OFFSET_HOURS * 3600 * 1000)
            // 如果時間有落差，平滑校正時鐘
            if (Math.abs(adjustedTime.getTime() - currentTime.getTime()) > 1000) {
              viewer.clock.currentTime = adjustedTime
            }
            isUpdating = false
          })
        }


        if (ION_TOKEN && ION_TOKEN !== "填入你的Token") {
          // 載入 Cesium World Terrain（ion asset ID: 1）
          viewer.terrain.set({
            type: "cesium-ion",
            assetId: 1,
            apiToken: ION_TOKEN
          })

          // Google Maps 2D Satellite 影像圖層
          viewer.overlays.add({
            id: "google-maps-2d-satellite",
            name: "Google Maps 2D Satellite",
            source: {
              type: "cesium-ion",
              assetId: GOOGLE_MAPS_2D_SATELLITE_ASSET_ID,
              apiToken: ION_TOKEN
            }
          })




          // // 載入 Google 底圖
          // viewer.tilesets.add({
          //   source: {
          //     type: "cesium-ion",
          //     assetId: GOOGLE_PHOTOREALISTIC_ASSET_ID,
          //     apiToken: ION_TOKEN
          //   },

          //   id: "google-photorealistic-3d-tiles",
          //   creasedNormals: true,
          // })







          // 載入 OSM 建築
          const osmLayer = viewer.tilesets.add({
            source: {
              type: "cesium-ion",
              assetId: OSM_ASSET_ID,
              apiToken: ION_TOKEN
            },

            id: "osm-buildings",
            materialMode: "preserved",
            creasedNormals: true,
          })

          ;(osmLayer.tileset as any).addEventListener(
            "load-model",
            (event: any) => {
              event.scene.traverse((child: any) => {
                if (child.isMesh && child.material) {
                  child.material.color.set('#ff0101')
                  child.material.transparent = false
                  child.material.opacity = 1
                  // child.material.depthWrite = false
                  // child.material.depthTest = false
                  // child.renderOrder = 999
                  child.material.needsUpdate = true
                }
              })
            }
          )
        }

        // 繪製紅點
        const { data: reports, error } = await supabase.from('reports').select('*')

        if (error) {
          console.error("無法從雲端載入通報資料:", error)
        } else if (reports) {
          reports.forEach((report: any) => {
            viewer.entities.add({
              id: `report-${report.id}`,
              position: [report.lon, report.lat, 80],
              point: {
                color: report.is_urgent_police ? "#dc2626" : "#ef4444", // 如果是緊急通報可以用更深或醒目的紅
                pixelSize: 22,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
              } as any,
              properties: {
                isReport: true,
                text: report.text,
                time: report.time,
                category: report.category,
                name: report.name,
                phone: report.phone,
                email: report.email,
                isUrgentPolice: report.is_urgent_police
              }
            })
          })
        }



        const handleMouseMove = (event: ViewerMouseMoveEvent) => {
          const pick = event.pick

          if (!pick) {
            setHoverInfo(prev => ({
              ...prev,
              visible: false
            }))

            viewer.highlighter.setHover(null as any)
            return
          }

          let entityId = ""
          const rawPick = pick as any

          if (
            rawPick.type === "entity" &&
            rawPick.entity &&
            rawPick.entity.entity
          ) {
            const realEntity = rawPick.entity.entity

            entityId =
              typeof realEntity.id === "string"
                ? realEntity.id
                : ""
          }

          // Citizen Report hover
          if (entityId.startsWith('report-')) {
            setHoverInfo({
              visible: true,
              x: event.position.x + 15,
              y: event.position.y + 15,
              text: "🚨 Citizen Report"
            })

            viewer.highlighter.setHover(null as any)
            return
          }

          const feature =
            (pick as any).type === "tilesFeature"
              ? (pick as any).feature
              : null

          // OSM building hover
          if (
            feature &&
            feature.layerId === "osm-buildings"
          ) {
            setHoverInfo({
              visible: true,
              x: event.position.x + 15,
              y: event.position.y + 15,
              text: getFeatureName(feature)
            })

            viewer.highlighter.setHover(pick!)
          } else {
            setHoverInfo(prev => ({
              ...prev,
              visible: false
            }))

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

          let entityId = ""
          const rawPick = pick as any

          if (
            rawPick.type === "entity" &&
            rawPick.entity &&
            rawPick.entity.entity
          ) {
            const realEntity = rawPick.entity.entity

            entityId =
              typeof realEntity.id === "string"
                ? realEntity.id
                : ""
          }

          // Citizen Report click
          if (entityId.startsWith('report-')) {
            const reportId = entityId.replace('report-', '')
            const targetReport = reports?.find((r: any) => String(r.id) === reportId)

            if (targetReport) {
              setPopupReport({ 
                text: targetReport.text || "無詳細內容", 
                time: targetReport.time || "未知時間",
                category: targetReport.category,
                name: targetReport.name,
                phone: targetReport.phone,
                email: targetReport.email,
                isUrgentPolice: targetReport.is_urgent_police
              })
              setPopupFeature(null) 
              viewer.highlighter.clear()
              return
            }
          }

          const feature =
            (pick as any).type === "tilesFeature"
              ? (pick as any).feature
              : null

          // OSM building click
          if (
            feature &&
            feature.layerId === "osm-buildings"
          ) {
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

        ;(viewer as any)._cleanupEvents = () => {
          viewer.off("mousemove", handleMouseMove)
          viewer.off("click", handleClick)
        }

      } catch (e) {
        console.error("Viewer 初始化失敗:", e)
      }
    }

    initViewer()

    return () => {
      isCancelled = true

      if (viewerRef.current) {
        if (viewerRef.current._cleanupEvents) {
          viewerRef.current._cleanupEvents()
        }

        viewerRef.current.destroy()
        viewerRef.current = null
      }
    }
  }, [])

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden"
      }}
    >

      {/* 3D 畫布容器 */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%"
        }}
      />

      {/* 滑鼠 Hover 提示框 */}
      {hoverInfo.visible && (
        <div
          style={{
            position: "absolute",
            left: hoverInfo.x,
            top: hoverInfo.y,
            background: "rgba(0, 0, 0, 0.85)",
            color: "white",
            padding: "4px 8px",
            borderRadius: "4px",
            pointerEvents: "none",
            fontSize: "14px",
            zIndex: 1100
          }}
        >
          {hoverInfo.text}
        </div>
      )}

      {/* 建築物屬性面板 */}
      {popupFeature && (
        <div
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            background: "rgba(20, 20, 20, 0.9)",
            color: "white",
            padding: "16px",
            borderRadius: "8px",
            border: "1px solid #444",
            maxHeight: "80vh",
            overflowY: "auto",
            zIndex: 1000
          }}
        >
          <h2
            style={{
              marginTop: 0,
              fontSize: "18px"
            }}
          >
            {getFeatureName(popupFeature)}
          </h2>

          <p
            style={{
              fontSize: "12px",
              color: "#aaa"
            }}
          >
            Longitude: {popupFeature.cartographic.longitude.toFixed(5)}
            <br />
            Latitude: {popupFeature.cartographic.latitude.toFixed(5)}
          </p>

          <table
            style={{
              textAlign: "left",
              borderCollapse: "collapse",
              fontSize: "14px",
              width: "100%"
            }}
          >
            <tbody>
              {Object.entries(popupFeature.properties)
                .slice(0, 10)
                .map(([key, value]) => (
                  <tr key={key}>
                    <th
                      style={{
                        padding: "4px",
                        borderBottom: "1px solid #444"
                      }}
                    >
                      {key}
                    </th>

                    <td
                      style={{
                        padding: "4px",
                        borderBottom: "1px solid #444"
                      }}
                    >
                      {String(value)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 民眾通報面板 */}
      {popupReport && (
        <div
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            background: "rgba(220, 38, 38, 0.9)",
            color: "white",
            padding: "16px",
            borderRadius: "8px",
            border: "1px solid #ef4444",
            minWidth: "250px",
            zIndex: 1000,
            boxShadow: "0 4px 6px rgba(0,0,0,0.3)"
          }}
        >
          <h2
            style={{
              marginTop: 0,
              fontSize: "18px",
              borderBottom:
                "1px solid rgba(255,255,255,0.3)",
              paddingBottom: "8px"
            }}
          >
            🚨 Citizen Reported Case
          </h2>

<div
            style={{
              fontSize: "14px",
              marginTop: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "6px"
            }}
          >
            {/* 類別 */}
            <p style={{ margin: 0 }}>
              <strong>Category:</strong> {popupReport.category || "N/A"}
            </p>

            {/* 是否緊急通報警局 */}
            {popupReport.isUrgentPolice && (
              <p style={{ margin: 0, background: "rgba(0,0,0,0.3)", padding: "4px 8px", borderRadius: "4px", color: "#f87171", fontWeight: "bold" }}>
                🚨 Urgent: Police Notified
              </p>
            )}

            {/* 聯絡人資訊 */}
            <p style={{ margin: 0 }}>
              <strong>Name:</strong> {popupReport.name || "Anonymous"}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Phone:</strong> {popupReport.phone || "N/A"}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Email:</strong> {popupReport.email || "N/A"}
            </p>

            <p style={{ margin: "4px 0" }}>
              <strong>Report Time:</strong>{" "}
              {popupReport.time}
            </p>

            <p style={{ margin: "4px 0" }}>
              <strong>Content:</strong>
            </p>

            <p
              style={{
                margin: "4px 0",
                padding: "8px",
                background: "rgba(0,0,0,0.2)",
                borderRadius: "4px"
              }}
            >
              {popupReport.text}
            </p>
          </div>

          <button
            onClick={() => setPopupReport(null)}
            style={{
              marginTop: "16px",
              width: "100%",
              padding: "8px",
              background: "white",
              color: "#dc2626",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            Close
          </button>
        </div>
      )}

    </div>
  )
}