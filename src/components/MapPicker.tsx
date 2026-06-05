'use client'

import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// 🌟 ĐÃ NÂNG CẤP: Thiết kế lại Marker thành SVG màu xanh lá hiện đại, chuẩn UI các app gọi xe
const customSportIcon = L.icon({
  iconUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42"><path d="M16 0C7.16 0 0 7.16 0 16c0 11.25 14.54 24.77 15.16 25.34a1.16 1.16 0 0 0 1.68 0C17.46 40.77 32 27.25 32 16 32 7.16 24.84 0 16 0zm0 23c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" fill="%2322c55e"/><circle cx="16" cy="16" r="5" fill="white"/></svg>`,
  iconSize: [32, 42],
  iconAnchor: [16, 42], // Đặt chân ghim đúng vị trí tọa độ
  popupAnchor: [0, -40],
})

L.Marker.prototype.options.icon = customSportIcon

interface MapPickerProps {
  lat: number | null
  lng: number | null
  onLocationSelect: (lat: number, lng: number) => void
}

// Component to handle map click events
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// Component to fly to a specific location
function FlyToLocation({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([lat, lng], 16, { duration: 1 })
  }, [lat, lng, map])
  return null
}

export default function MapPicker({ lat, lng, onLocationSelect }: MapPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [suggestions, setSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Default center: Ho Chi Minh City
  const defaultLat = 10.7769
  const defaultLng = 106.7009
  const centerLat = lat ?? defaultLat
  const centerLng = lng ?? defaultLng

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Try to extract coords from pasted text (lat,lng or Google Maps URL)
  function tryExtractCoords(input: string): { lat: number; lng: number } | null {
    const trimmed = input.trim()

    const directMatch = trimmed.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/)
    if (directMatch) {
      return { lat: parseFloat(directMatch[1]), lng: parseFloat(directMatch[2]) }
    }

    const atMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (atMatch) {
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) }
    }

    const queryMatch = trimmed.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (queryMatch) {
      return { lat: parseFloat(queryMatch[1]), lng: parseFloat(queryMatch[2]) }
    }

    const dataMatch = trimmed.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
    if (dataMatch) {
      return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) }
    }

    return null
  }

  function handleSearch(query: string) {
    setSearchQuery(query)

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    const coords = tryExtractCoords(query)
    if (coords) {
      setSuggestions([])
      setShowSuggestions(false)
      onLocationSelect(coords.lat, coords.lng)
      return
    }

    if (query.trim().length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=vn&limit=5`
        )
        const data = await res.json()
        setSuggestions(data)
        setShowSuggestions(data.length > 0)
      } catch {
        setSuggestions([])
        setShowSuggestions(false)
      } finally {
        setSearching(false)
      }
    }, 500)
  }

  function selectSuggestion(suggestion: { display_name: string; lat: string; lon: string }) {
    const selectedLat = parseFloat(suggestion.lat)
    const selectedLng = parseFloat(suggestion.lon)
    onLocationSelect(selectedLat, selectedLng)
    setSearchQuery(suggestion.display_name.split(',')[0])
    setSuggestions([])
    setShowSuggestions(false)
  }

  return (
    <div className="space-y-2">
      {/* Search - positioned above map with higher z-index */}
      <div ref={wrapperRef} className="relative z-[500]">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
          placeholder="Tìm sân hoặc dán tọa độ: 10.7321, 106.7019"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 pr-10 shadow-sm"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-[9999] top-full left-0 right-0 mt-1 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden max-h-60 overflow-y-auto">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectSuggestion(s)}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-green-50 border-b border-gray-100 last:border-0 transition-colors"
              >
                <span className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5 shrink-0">📍</span>
                  <span className="line-clamp-2 text-xs leading-relaxed">{s.display_name}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map container */}
      <div className="relative z-0 rounded-2xl overflow-hidden border border-gray-100 shadow-md" style={{ height: '240px' }}>
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={lat ? 16 : 13}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
          attributionControl={false}
          zoomControl={false}
        >
          {/* 🌟 ĐÃ NÂNG CẤP: Thay đổi lớp bản đồ sang phong cách Voyager thể thao, hiện đại */}
          <TileLayer 
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" 
            subdomains="abcd"
            maxZoom={20}
          />
          <MapClickHandler onLocationSelect={onLocationSelect} />
          {lat && lng && (
            <>
              <Marker position={[lat, lng]} icon={customSportIcon} />
              <FlyToLocation lat={lat} lng={lng} />
            </>
          )}
        </MapContainer>
      </div>

      <p className="text-[10px] text-gray-400 leading-relaxed px-1">
        💡 Gõ tên sân, dán tọa độ, dán link Google Maps, hoặc bấm trực tiếp vào bản đồ để chọn vị trí.
      </p>
    </div>
  )
}