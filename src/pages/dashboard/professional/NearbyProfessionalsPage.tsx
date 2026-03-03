import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { useQuery } from '@tanstack/react-query'
import {
  MapPin, Navigation, ChevronLeft, User, SlidersHorizontal,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────

interface NearbyProfessional {
  id: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  city: string | null
  state: string | null
  coverage_radius_km: number | null
  user_type: string
  latitude: number
  longitude: number
  distance_km: number
}

// ─── Leaflet icon fix (avoids PNG import issues no Vite) ──────

function createIcon(active: boolean) {
  const bg = active ? '#7c3aed' : '#4f46e5'
  return L.divIcon({
    className: '',
    html: `<div style="width:36px;height:36px;background:${bg};border:3px solid white;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 10px rgba(0,0,0,0.35);cursor:pointer;transition:background 0.2s">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -38],
  })
}

function createUserIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:20px;height:20px;background:#ef4444;border:2px solid white;border-radius:50%;
      box-shadow:0 1px 6px rgba(0,0,0,0.4)"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

// ─── MapController ────────────────────────────────────────────

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom, { animate: true })
  }, [center, zoom, map])
  return null
}

// ─── Professional Card (sidebar) ──────────────────────────────

function ProfCard({
  prof,
  active,
  onClick,
}: {
  prof: NearbyProfessional
  active: boolean
  onClick: () => void
}) {
  const typeLabel: Record<string, string> = {
    profissional: 'Profissional',
    empresa_prestadora: 'Empresa',
  }
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        active
          ? 'border-primary-400 bg-primary-50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-primary-200 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shrink-0">
          {prof.avatar_url ? (
            <img src={prof.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User size={18} className="text-slate-300" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-slate-900 text-sm truncate">
              {prof.full_name ?? 'Sem nome'}
            </p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 shrink-0">
              {typeLabel[prof.user_type] ?? prof.user_type}
            </span>
          </div>

          {(prof.city || prof.state) && (
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin size={10} />
              {[prof.city, prof.state].filter(Boolean).join(' / ')}
            </p>
          )}

          {prof.bio && (
            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{prof.bio}</p>
          )}
        </div>

        {/* Distance */}
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-primary-600">
            {prof.distance_km < 1
              ? `${(prof.distance_km * 1000).toFixed(0)} m`
              : `${prof.distance_km.toFixed(1)} km`}
          </p>
        </div>
      </div>
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────

const RADIUS_OPTIONS = [10, 25, 50, 100, 200]
// Default center: Brasil
const BRAZIL_CENTER: [number, number] = [-15.77972, -47.92972]

export function NearbyProfessionalsPage() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [radius, setRadius] = useState(50)
  const [locating, setLocating] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const { data: professionals = [], isLoading } = useQuery({
    queryKey: ['nearby-professionals', coords?.lat, coords?.lng, radius],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_nearby_professionals', {
        user_lat: coords!.lat,
        user_lng: coords!.lng,
        radius_km: radius,
      })
      if (error) throw error
      return (data ?? []) as NearbyProfessional[]
    },
    enabled: !!coords,
  })

  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada neste navegador')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      () => {
        toast.error('Permissão de localização negada ou indisponível')
        setLocating(false)
      },
      { timeout: 10000 }
    )
  }

  // Auto-request on mount
  useEffect(() => {
    requestLocation()
  }, [])

  const mapCenter: [number, number] = coords
    ? [coords.lat, coords.lng]
    : BRAZIL_CENTER

  const activeProf = professionals.find((p) => p.id === activeId)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/dashboard/profissionais" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profissionais Próximos</h1>
          <p className="text-sm text-slate-500">Encontre profissionais na sua região</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={15} className="text-slate-400 shrink-0" />
          <span className="text-sm text-slate-600 font-medium whitespace-nowrap">Raio:</span>
          <div className="flex gap-1.5">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRadius(r)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  radius === r
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {r} km
              </button>
            ))}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {coords && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <MapPin size={11} />
              Localização ativa
            </span>
          )}
          <button
            onClick={requestLocation}
            disabled={locating}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-60"
          >
            {locating
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Navigation size={14} />
            }
            {coords ? 'Atualizar localização' : 'Usar minha localização'}
          </button>
        </div>
      </div>

      {/* No location yet */}
      {!coords && !locating && (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-4">
            <Navigation size={28} className="text-primary-500" />
          </div>
          <h3 className="font-semibold text-slate-800 mb-1">Permita o acesso à localização</h3>
          <p className="text-sm text-slate-500 mb-6">
            Para ver profissionais próximos, precisamos saber onde você está.
          </p>
          <button
            onClick={requestLocation}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
          >
            <Navigation size={15} />
            Permitir localização
          </button>
        </div>
      )}

      {/* Map + List */}
      {(coords || locating) && (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Sidebar list */}
          <div className="lg:w-80 shrink-0 space-y-2">
            <p className="text-sm text-slate-500 font-medium px-1">
              {isLoading ? 'Buscando...' : `${professionals.length} profissional${professionals.length !== 1 ? 'is' : ''} encontrado${professionals.length !== 1 ? 's' : ''}`}
            </p>

            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : professionals.length === 0 && coords ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <User size={32} className="text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  Nenhum profissional em {radius} km.<br />
                  <button
                    onClick={() => setRadius(200)}
                    className="text-primary-600 underline mt-1 text-xs"
                  >
                    Ampliar para 200 km
                  </button>
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {professionals.map((p) => (
                  <ProfCard
                    key={p.id}
                    prof={p}
                    active={activeId === p.id}
                    onClick={() => setActiveId(activeId === p.id ? null : p.id)}
                  />
                ))}
              </div>
            )}

            {activeProf && (
              <Link
                to={`/dashboard/profissional/${activeProf.id}`}
                className="block w-full text-center py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
              >
                Ver perfil de {activeProf.full_name?.split(' ')[0] ?? 'profissional'}
              </Link>
            )}
          </div>

          {/* Map */}
          <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 h-[480px]">
            <MapContainer
              center={mapCenter}
              zoom={coords ? 11 : 4}
              style={{ width: '100%', height: '100%' }}
              zoomControl={true}
            >
              {coords && <MapController center={mapCenter} zoom={11} />}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* User location marker */}
              {coords && (
                <Marker
                  position={[coords.lat, coords.lng]}
                  icon={createUserIcon()}
                />
              )}

              {/* Professional markers */}
              {professionals.map((p) => (
                <Marker
                  key={p.id}
                  position={[p.latitude, p.longitude]}
                  icon={createIcon(activeId === p.id)}
                  eventHandlers={{
                    click: () => setActiveId(activeId === p.id ? null : p.id),
                  }}
                >
                  <Popup>
                    <div className="text-sm space-y-1 min-w-[160px]">
                      <p className="font-bold text-slate-900">{p.full_name ?? 'Profissional'}</p>
                      {(p.city || p.state) && (
                        <p className="text-slate-500 text-xs">
                          {[p.city, p.state].filter(Boolean).join(' / ')}
                        </p>
                      )}
                      <p className="text-primary-600 text-xs font-semibold">
                        {p.distance_km < 1
                          ? `${(p.distance_km * 1000).toFixed(0)} m de distância`
                          : `${p.distance_km.toFixed(1)} km de distância`}
                      </p>
                      <Link
                        to={`/dashboard/profissional/${p.id}`}
                        className="block text-center py-1 px-3 bg-primary-600 text-white rounded-lg text-xs font-semibold hover:bg-primary-700 transition-colors mt-2"
                      >
                        Ver perfil
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  )
}
