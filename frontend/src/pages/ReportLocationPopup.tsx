import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useI18n } from '../i18n'

type ReportLocationPopupProps = {
  address: string
  latitude: number
  longitude: number
  onClose: () => void
}

export default function ReportLocationPopup({
  address,
  latitude,
  longitude,
  onClose,
}: ReportLocationPopupProps) {
  const { t } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 17,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)
    L.circleMarker([latitude, longitude], {
      radius: 9,
      color: '#ffffff',
      weight: 3,
      fillColor: '#dc2626',
      fillOpacity: 1,
    }).addTo(map)

    return () => {
      map.remove()
    }
  }, [latitude, longitude])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="report-location-popup-backdrop" onClick={onClose}>
      <div
        aria-label={t('Report location')}
        aria-modal="true"
        className="report-location-popup"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="report-location-popup-header">
          <span>{address || `${latitude}, ${longitude}`}</span>
          <button aria-label={t('Close')} onClick={onClose} type="button">×</button>
        </div>
        <div className="report-location-popup-map" ref={containerRef} />
      </div>
    </div>
  )
}
