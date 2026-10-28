import { useCallback, useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './ReportLocationMap.css'
import { useI18n } from '../i18n'

const concepcionCenter: L.LatLngExpression = [-36.827063, -73.050201]

const locationIcon = L.divIcon({
  className: 'report-location-marker',
  html: '<span></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

const deviceLocationIcon = L.divIcon({
  className: 'report-device-location-marker',
  html: '<span></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

type ReportLocationMapProps = {
  latitude: number | null
  longitude: number | null
  onLocationSelect: (latitude: number, longitude: number) => void
  onDeviceLocation: (latitude: number, longitude: number, isInitialLocation: boolean) => void
}

export default function ReportLocationMap({
  latitude,
  longitude,
  onLocationSelect,
  onDeviceLocation,
}: ReportLocationMapProps) {
  const { t } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<LeafletMarker | null>(null)
  const deviceMarkerRef = useRef<LeafletMarker | null>(null)
  const initialLocationRequestedRef = useRef(false)
  const onLocationSelectRef = useRef(onLocationSelect)
  const onDeviceLocationRef = useRef(onDeviceLocation)
  const [deviceCoordinates, setDeviceCoordinates] = useState<[number, number] | null>(null)
  const [locationStatus, setLocationStatus] = useState('Finding your device location...')
  const [isLocating, setIsLocating] = useState(false)

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect
    onDeviceLocationRef.current = onDeviceLocation
  }, [onDeviceLocation, onLocationSelect])

  const locateDevice = useCallback((isInitialLocation: boolean) => {
    if (!navigator.geolocation) {
      setLocationStatus('Device location is not available in this browser. You can still select a point on the map.')
      setIsLocating(false)
      return
    }

    setIsLocating(true)
    setLocationStatus('Finding your device location...')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const position: [number, number] = [
          Number(coords.latitude.toFixed(6)),
          Number(coords.longitude.toFixed(6)),
        ]
        setDeviceCoordinates(position)
        setLocationStatus('Blue dot: your device · Red pin: report location')
        setIsLocating(false)
        const map = mapRef.current
        if (map) map.flyTo(position, Math.max(map.getZoom(), 16), { duration: 0.7 })
        onDeviceLocationRef.current(position[0], position[1], isInitialLocation)
      },
      (error) => {
        console.warn('Unable to get device location:', error.message)
        const message = error.code === error.PERMISSION_DENIED
          ? 'Location permission denied. Allow location access in your browser, or select a point on the map.'
          : error.code === error.TIMEOUT
            ? 'Device location timed out. Try again or select a point on the map.'
            : 'Unable to get device location. You can still select a point on the map.'
        setLocationStatus(message)
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const map = L.map(containerRef.current, {
      center: concepcionCenter,
      zoom: 13,
      scrollWheelZoom: false,
    })
    const deviceLocationPane = map.createPane('deviceLocationPane')
    deviceLocationPane.style.zIndex = '610'
    const reportLocationPane = map.createPane('reportLocationPane')
    reportLocationPane.style.zIndex = '620'
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    map.on('click', (event: L.LeafletMouseEvent) => {
      onLocationSelectRef.current(
        Number(event.latlng.lat.toFixed(6)),
        Number(event.latlng.lng.toFixed(6)),
      )
    })

    if (!initialLocationRequestedRef.current) {
      initialLocationRequestedRef.current = true
      locateDevice(true)
    }

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
      deviceMarkerRef.current = null
    }
  }, [locateDevice])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !deviceCoordinates) return

    if (deviceMarkerRef.current) {
      deviceMarkerRef.current.setLatLng(deviceCoordinates)
    } else {
      deviceMarkerRef.current = L.marker(deviceCoordinates, {
        icon: deviceLocationIcon,
        pane: 'deviceLocationPane',
        interactive: false,
      }).addTo(map)
    }
  }, [deviceCoordinates])

  useEffect(() => {
    const map = mapRef.current
    if (!map || latitude === null || longitude === null) return
    if (
      !Number.isFinite(latitude)
      || !Number.isFinite(longitude)
      || latitude < -90
      || latitude > 90
      || longitude < -180
      || longitude > 180
    ) return

    const position: L.LatLngExpression = [latitude, longitude]
    map.flyTo(position, Math.max(map.getZoom(), 16), { duration: 0.7 })

    if (markerRef.current) {
      markerRef.current.setLatLng(position)
    } else {
      markerRef.current = L.marker(position, {
        icon: locationIcon,
        pane: 'reportLocationPane',
      }).addTo(map)
    }
  }, [latitude, longitude])

  return (
    <div className="report-location-map-shell">
      <div className="report-location-map-toolbar">
        <span className="report-location-status" role="status">{t(locationStatus)}</span>
        <button
          className="report-location-device-button"
          disabled={isLocating}
          onClick={() => locateDevice(false)}
          type="button"
        >
          {isLocating ? t('Locating...') : t('Use my device location')}
        </button>
      </div>
      <div
        className="report-location-map"
        ref={containerRef}
        role="application"
        aria-label={t('Select a report location on the map')}
      />
    </div>
  )
}
