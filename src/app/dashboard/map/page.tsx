'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { getStatusColor } from '@/lib/utils'
import 'leaflet/dist/leaflet.css'

// Dynamically import map components to avoid SSR issues with Leaflet
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const CircleMarker = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false })

export default function MapPage() {
  const [roads, setRoads] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/roads')
      .then(res => res.json())
      .then(data => setRoads(Array.isArray(data) ? data : []))
  }, [])

  // Center on the registered roads; fall back to Pune before they load
  const center: [number, number] = roads.length > 0
    ? [
        roads.reduce((s, r) => s + r.lat, 0) / roads.length,
        roads.reduce((s, r) => s + r.lng, 0) / roads.length,
      ]
    : [18.5204, 73.8567]

  return (
    <div className="flex-col gap-6 h-full" style={{ display: 'flex' }}>
      <div>
        <h2>Road Network Map</h2>
        <p>Geospatial overview of pavement health and critical zones.</p>
      </div>

      <div className="card" style={{ flex: 1, padding: 4, minHeight: 600 }}>
        <MapContainer
          key={roads.length > 0 ? 'loaded' : 'empty'}
          center={center}
          zoom={10}
          style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-lg)', zIndex: 0 }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          
          {roads.map(road => (
            <CircleMarker
              key={road.id}
              center={[road.lat, road.lng]}
              radius={10}
              pathOptions={{
                color: getStatusColor(road.status),
                fillColor: getStatusColor(road.status),
                fillOpacity: 0.7,
                weight: 2
              }}
            >
              <Popup>
                <div style={{ padding: '4px 0' }}>
                  <h4 style={{ margin: '0 0 4px', fontSize: 16 }}>{road.name}</h4>
                  <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-muted)' }}>{road.location}</p>
                  
                  <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
                    <span className="text-sm font-semibold">Health Score:</span>
                    <span className={`badge badge-${road.status.toLowerCase()}`}>{road.healthScore}/100</span>
                  </div>
                  
                  <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
                    <span className="text-sm">Status:</span>
                    <span className="font-semibold" style={{ color: getStatusColor(road.status) }}>{road.status}</span>
                  </div>
                  
                  <a href={`/dashboard/roads/${road.id}`} style={{ display: 'block', textAlign: 'center', padding: '6px', background: 'var(--bg-tertiary)', borderRadius: 4, textDecoration: 'none', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600 }}>
                    View Details →
                  </a>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
