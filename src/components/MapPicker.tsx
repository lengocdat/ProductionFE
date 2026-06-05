'use client'

import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default marker icon issue with bundlers
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

L.Marker.prototype.options.icon = defaultIcon

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
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Default center: Ho Chi Minh City
  const defaultLat = 10.7769
  const defaultLng = 106.7009
  const centerLat = lat ?? defaultLat
  const centerLng = lng ?? defaultLng

  // Try to extract coords from pasted text (lat,lng or Google Maps URL)
  function tryExtractCoords(input: string): { lat: number; lng: number } | null {
    const trimmed = input.trim()

    // Direct coords: "10.7321, 106.7019"
    const directMatch = trimmed.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/)
    if (directMatch) {
      return { lat: parseFloat(directMatch[1]), lng: parseFloat(directMatch[2]) }
    }

    // Google Maps /@lat,lng
    const atMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (atMatch) {
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) }
    }

    // ?q=lat,lng or &query=lat,lng or &ll=lat,lng
    const queryMatch = trimmed.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (queryMatch) {
      return { lat: parseFloat(queryMatch[1]), lng: parseFloat(queryMatch[2]) }
    }

    // !3d<lat>!4d<lng>
    const dataMatch = trimmed.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
    if (dataMatch) {
      return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) }
    }

    return null
  }

  // Search using Nominatim (OpenStreetMap free geocoding)
  function handleSearch(query: string) {
    setSearchQuery(query)

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    // Try to extract coords from pasted input first
    const coords = tryExtractCoords(query)
    if (coords) {
      setSuggestions([])
      onLocationSelect(coords.lat, coords.lng)
      return
    }

    if (query.trim().length < 3) {
      setSuggestions([])
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
      } catch {
        setSuggestions([])
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
  }

  return (
    <div className="space-y-2">
      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Tìm sân hoặc dán tọa độ: 10.7321, 106.7019"
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-green-400 pr-10"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute z-[1000] top-full left-0 right-0 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectSuggestion(s)}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-green-50 border-b border-gray-50 last:border-0 line-clamp-1"
              >
                📍 {s.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: '250px' }}>
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={lat ? 16 : 13}
          style={{ height: '100%', width: '100%' }}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onLocationSelect={onLocationSelect} />
          {lat && lng && (
            <>
              <Marker position={[lat, lng]} />
              <FlyToLocation lat={lat} lng={lng} />
            </>
          )}
        </MapContainer>
      </div>

      <p className="text-[10px] text-gray-400">
        💡 Gõ tên sân, dán tọa độ (10.7321, 106.7019), dán link Google Maps, hoặc bấm trực tiếp vào bản đồ.
      </p>
    </div>
  )
}
