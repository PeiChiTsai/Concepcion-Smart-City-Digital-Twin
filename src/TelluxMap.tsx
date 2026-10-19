import React, { useEffect, useRef, useState } from 'react'
import tellux from 'tellux'
import * as Cesium from 'cesium'
import * as THREE from 'three'
import type { ViewerMouseMoveEvent, ViewerClickEvent, Picked3DTilesFeature } from 'tellux'
import { supabase } from './supabaseClient' 

const ION_TOKEN = import.meta.env.VITE_CESIUM_ION_TOKEN || "Please enter your Token"
//OSM_ASSET_ID = 96188
//Concepcion_3D_Tiles = 5950827
const OSM_ASSET_ID = 6053677
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

type ReportLayer = 'pending' | 'in-progress' | 'resolved' | 'urgent'
type ReportLayerFilters = Record<ReportLayer, boolean>

const BUILDING_HEIGHT_COLORS = [
  { height: 0, color: new THREE.Color('#2dd4bf') },
  { height: 8, color: new THREE.Color('#4ade80') },
  { height: 18, color: new THREE.Color('#facc15') },
  { height: 35, color: new THREE.Color('#fb923c') },
  { height: 60, color: new THREE.Color('#ef4444') },
]

function getBuildingHeightColor(height: number) {
  const first = BUILDING_HEIGHT_COLORS[0]
  const last = BUILDING_HEIGHT_COLORS[BUILDING_HEIGHT_COLORS.length - 1]

  if (height <= first.height) return first.color
  if (height >= last.height) return last.color

  for (let index = 1; index < BUILDING_HEIGHT_COLORS.length; index += 1) {
    const upper = BUILDING_HEIGHT_COLORS[index]
    const lower = BUILDING_HEIGHT_COLORS[index - 1]

    if (height <= upper.height) {
      const amount = (height - lower.height) / (upper.height - lower.height)
      return lower.color.clone().lerp(upper.color, amount)
    }
  }

  return last.color
}

function colorBuildingMesh(mesh: THREE.Mesh) {
  const geometry = mesh.geometry.clone()
  mesh.geometry = geometry
  if (!geometry.boundingBox) geometry.computeBoundingBox()

  const position = geometry.getAttribute('position')
  const meshFeatures = (mesh.userData as {
    meshFeatures?: { getFeatureInfo?: () => Array<{ attribute?: number | null; nullFeatureId?: number | null }> }
  }).meshFeatures
  const featureAttributeIndex = meshFeatures?.getFeatureInfo?.()
    .find(feature => feature.attribute !== undefined && feature.attribute !== null)?.attribute
  const featureAttributeName = featureAttributeIndex === undefined
    ? undefined
    : `_feature_id_${featureAttributeIndex}`
  const featureAttribute = (featureAttributeName
    ? geometry.getAttribute(featureAttributeName)
    : undefined) ?? Object.entries(geometry.attributes)
    .find(([name]) => /^_feature_id_\d+$/i.test(name) || /batch.?id/i.test(name))?.[1]

  if (position && featureAttribute) {
    const featureHeights = new Map<number, { min: number; max: number }>()

    for (let index = 0; index < position.count; index += 1) {
      const featureId = featureAttribute.getX(index)
      const y = position.getY(index)
      if (!Number.isFinite(featureId) || !Number.isFinite(y)) continue

      const bounds = featureHeights.get(featureId)
      if (bounds) {
        bounds.min = Math.min(bounds.min, y)
        bounds.max = Math.max(bounds.max, y)
      } else {
        featureHeights.set(featureId, { min: y, max: y })
      }
    }

    const colors = new Float32Array(position.count * 3)
    const color = new THREE.Color()

    for (let index = 0; index < position.count; index += 1) {
      const bounds = featureHeights.get(featureAttribute.getX(index))
      color.copy(bounds
        ? getBuildingHeightColor(bounds.max - bounds.min)
        : getBuildingHeightColor(0))
      color.toArray(colors, index * 3)
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  } else {
    const height = geometry.boundingBox?.getSize(new THREE.Vector3()).y ?? 0
    const color = getBuildingHeightColor(height)
    const colors = new Float32Array(position ? position.count * 3 : 0)

    for (let index = 0; index < colors.length; index += 3) {
      color.toArray(colors, index)
    }

    if (position) geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  }

  const colorMaterial = (material: THREE.Material) => {
    const clonedMaterial = material.clone()
    const materialWithColor = clonedMaterial as THREE.Material & {
      color?: THREE.Color
      vertexColors?: boolean
    }

    materialWithColor.color?.set('#ffffff')
    materialWithColor.vertexColors = true
    clonedMaterial.transparent = false
    clonedMaterial.opacity = 1
    clonedMaterial.needsUpdate = true
    return clonedMaterial
  }

  mesh.material = Array.isArray(mesh.material)
    ? mesh.material.map(colorMaterial)
    : colorMaterial(mesh.material)
}

function getFeatureName(feature: Picked3DTilesFeature) {
  const props = feature.properties

  for (const key of ["name", "Name", "NAME"]) {
    if (props[key]) return String(props[key])
  }

  return `OSM building ID: ${feature.featureId ?? "unknown"}`
}

function normalizeReportStatus(status: unknown) {
  return String(status ?? 'pending').trim().toLowerCase().replace(/\s+/g, '-')
}

function getReportLayer(report: { status?: unknown; is_urgent_police?: unknown }): ReportLayer {
  const status = normalizeReportStatus(report.status)

  if (status === 'resolved') return 'resolved'
  if (report.is_urgent_police === true || report.is_urgent_police === 'true') return 'urgent'
  if (status === 'in-progress') return 'in-progress'

  return 'pending'
}

function getReportColor(report: { status?: unknown; is_urgent_police?: unknown }) {
  const colors: Record<ReportLayer, string> = {
    pending: '#22c55e',
    'in-progress': '#facc15',
    resolved: '#ffffff',
    urgent: '#dc2626'
  }

  return colors[getReportLayer(report)]
}

function getReportStatusLabel(status: unknown) {
  const normalizedStatus = normalizeReportStatus(status)
  const labels: Record<string, string> = {
    pending: 'Pending',
    'in-progress': 'In Progress',
    resolved: 'Resolved'
  }

  return labels[normalizedStatus] ?? String(status ?? 'Pending')
}

function getReportPointSize(cameraHeight: number) {
  const referenceHeight = 800
  const size = 22 * Math.sqrt(referenceHeight / Math.max(cameraHeight, 1))
  return Math.round(Math.min(32, Math.max(8, size)))
}

export const TelluxMap: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)
  const reportEntitiesRef = useRef<Array<{ entity: any; layer: ReportLayer }>>([])
  const [reportLayerFilters, setReportLayerFilters] = useState<ReportLayerFilters>({
    pending: true,
    'in-progress': true,
    resolved: true,
    urgent: true
  })
  const reportLayerFiltersRef = useRef(reportLayerFilters)

  useEffect(() => {
    reportLayerFiltersRef.current = reportLayerFilters
    reportEntitiesRef.current.forEach(({ entity, layer }) => {
      entity.show = reportLayerFilters[layer]
    })
  }, [reportLayerFilters])

  const toggleReportLayer = (layer: ReportLayer, checked: boolean) => {
    const nextFilters = { ...reportLayerFiltersRef.current, [layer]: checked }
    reportLayerFiltersRef.current = nextFilters
    setReportLayerFilters(nextFilters)
  }

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
    status?: string
    name?: string
    phone?: string
    email?: string
  } | null>(null)

  useEffect(() => {
    let viewer: any = null
    let isCancelled = false

    async function initViewer() {
      if (!containerRef.current) return

      const fixedTime = new Date()
      fixedTime.setHours(12, 0, 0, 0)

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

          clock: {
            currentTime: fixedTime,
            shouldAnimate: false
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
            // timeline: true,
            timeline: false
          }
        })

        if (isCancelled) {
          viewer.destroy()
          return
        }

        viewer.globe.show = true
        viewerRef.current = viewer
        /*
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
        */


        if (ION_TOKEN && ION_TOKEN !== "Please enter your Token") {
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
                  colorBuildingMesh(child)
                }
              })
            }
          )
        }

        // 繪製紅點
        const reportEntities: any[] = []
        const categorizedReportEntities: Array<{ entity: any; layer: ReportLayer }> = []
        const { data: reports, error } = await supabase.from('reports').select('*')

        if (error) {
          console.error("無法從雲端載入通報資料:", error)
        } else if (reports) {
          reports.forEach((report: any) => {
            const layer = getReportLayer(report)
            const entity = viewer.entities.add({
              id: `report-${report.id}`,
              show: reportLayerFiltersRef.current[layer],
              position: [report.lon, report.lat, 80],
              point: {
                color: getReportColor(report),
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
            reportEntities.push(entity)
            categorizedReportEntities.push({ entity, layer })
          })
        }
        reportEntitiesRef.current = categorizedReportEntities

        const updateReportPointSizes = () => {
          const cameraHeight = viewer.camera.getCurrentHeight()
          if (cameraHeight === null || !Number.isFinite(cameraHeight)) return

          const pixelSize = getReportPointSize(cameraHeight)
          reportEntities.forEach(entity => {
            if (entity.point && entity.point.pixelSize !== pixelSize) {
              entity.point.pixelSize = pixelSize
            }
          })
        }

        let pointSizeUpdateFrame: number | null = null
        const scheduleReportPointSizeUpdate = () => {
          if (pointSizeUpdateFrame !== null) return

          pointSizeUpdateFrame = requestAnimationFrame(() => {
            pointSizeUpdateFrame = null
            updateReportPointSizes()
          })
        }

        const handlePointerMove = (event: PointerEvent) => {
          if (event.buttons > 0 || event.pointerType === 'touch') {
            scheduleReportPointSizeUpdate()
          }
        }

        const handleTouchMove = () => scheduleReportPointSizeUpdate()

        updateReportPointSizes()
        viewer.controls.addEventListener('change', updateReportPointSizes)
        viewer.container.addEventListener('wheel', scheduleReportPointSizeUpdate, { passive: true })
        viewer.container.addEventListener('pointermove', handlePointerMove, { passive: true })
        viewer.container.addEventListener('touchmove', handleTouchMove, { passive: true })



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
                isUrgentPolice: targetReport.is_urgent_police,
                status: targetReport.status
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
          viewer.controls.removeEventListener('change', updateReportPointSizes)
          viewer.container.removeEventListener('wheel', scheduleReportPointSizeUpdate)
          viewer.container.removeEventListener('pointermove', handlePointerMove)
          viewer.container.removeEventListener('touchmove', handleTouchMove)
          if (pointSizeUpdateFrame !== null) {
            cancelAnimationFrame(pointSizeUpdateFrame)
          }
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
      reportEntitiesRef.current = []
    }
  }, [])

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        overscrollBehavior: "none",
        touchAction: "none"
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
            background: `${getReportColor({
              status: popupReport.status,
              is_urgent_police: popupReport.isUrgentPolice
            })}cc`,
            color: getReportColor({
              status: popupReport.status,
              is_urgent_police: popupReport.isUrgentPolice
            }) === "#dc2626" ? "white" : "#111827",
            padding: "16px",
            borderRadius: "8px",
            border: "1px solid rgba(0,0,0,0.2)",
            minWidth: "250px",
            zIndex: 1000,
            boxShadow: "0 4px 6px rgba(0,0,0,0.3)"
          }}
        >
          <h2
            style={{
              marginTop: 0,
              fontSize: "18px",
              borderBottom: "1px solid rgba(0,0,0,0.2)",
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

            <p style={{ margin: 0 }}>
              <strong>Status:</strong> {getReportStatusLabel(popupReport.status)}
            </p>

            {/* 是否緊急通報警局 */}
            {popupReport.isUrgentPolice && (
              <p style={{ margin: 0, background: "rgba(0,0,0,0.15)", padding: "4px 8px", borderRadius: "4px", fontWeight: "bold" }}>
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
              background: "rgba(255,255,255,0.9)",
              color: "#111827",
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

      {/* 通報圖層篩選 */}
      <div
        style={{
          position: "absolute",
          right: 20,
          bottom: 20,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          padding: "12px 14px",
          borderRadius: "8px",
          background: "rgba(17, 24, 39, 0.86)",
          color: "white",
          fontSize: "13px",
          zIndex: 1000,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
        }}
      >
        <strong style={{ marginBottom: "2px" }}>Report Layers</strong>
        {([
          { layer: 'pending', label: 'Pending', color: '#22c55e' },
          { layer: 'in-progress', label: 'In Progress', color: '#facc15' },
          { layer: 'resolved', label: 'Resolved', color: '#ffffff' },
          { layer: 'urgent', label: 'Urgent Police', color: '#dc2626' }
        ] as const).map(({ layer, label, color }) => (
          <label
            key={layer}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            <input
              type="checkbox"
              checked={reportLayerFilters[layer]}
              onChange={event => toggleReportLayer(layer, event.target.checked)}
              style={{ accentColor: color, margin: 0 }}
            />
            <span
              aria-hidden="true"
              style={{
                width: "9px",
                height: "9px",
                borderRadius: "50%",
                background: color,
                border: layer === 'resolved' ? "1px solid #9ca3af" : "none"
              }}
            />
            {label}
          </label>
        ))}
      </div>

    </div>
  )
}