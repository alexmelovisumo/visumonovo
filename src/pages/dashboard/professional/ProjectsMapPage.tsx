import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft, MapPin, DollarSign, Calendar, Navigation, Map,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────

interface MappedProject {
  id: string
  title: string
  description: string
  city: string | null
  state: string | null
  budget_min: number | null
  budget_max: number | null
  deadline: string | null
  created_at: string
  latitude: number
  longitude: number
}

// ─── Helpers ─────────────────────────────────────────────────

function formatBudget(min: number | null, max: number | null) {
  if (!min && !max) return 'A combinar'
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `A partir de ${fmt(min)}`
  return `Até ${fmt(max!)}`
}

// ─── Marker icon ─────────────────────────────────────────────

function createProjectIcon(active: boolean) {
  const bg = active ? '#7c3aed' : '#4f46e5'
  return L.divIcon({
    className: '',
    html: `<div style="width:34px;height:34px;background:${bg};border:3px solid white;border-radius:8px;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 10px rgba(0,0,0,0.35);cursor:pointer;transition:background 0.2s">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white">
        <path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-8-2h4v2h-4V4z"/>
      </svg>
    </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -36],
  })
}

function createUserIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;background:#ef4444;border:2px solid white;border-radius:50%;
      box-shadow:0 1px 6px rgba(0,0,0,0.4)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
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

// ─── Project Card (sidebar) ───────────────────────────────────

function ProjectCard({
  project,
  active,
  onClick,
}: {
  project: MappedProject
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        active
          ? 'border-primary-400 bg-primary-50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-primary-200 hover:bg-slate-50'
      }`}
    >
      <p className="font-semibold text-slate-900 text-sm line-clamp-1 mb-1">{project.title}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
        {(project.city || project.state) && (
          <span className="flex items-center gap-0.5">
            <MapPin size={10} />
            {[project.city, project.state].filter(Boolean).join('/')}
          </span>
        )}
        <span className="flex items-center gap-0.5">
          <DollarSign size={10} />
          {formatBudget(project.budget_min, project.budget_max)}
        </span>
        {project.deadline && (
          <span className="flex items-center gap-0.5">
            <Calendar size={10} />
            {format(new Date(project.deadline), 'dd/MM/yy', { locale: ptBR })}
          </span>
        )}
      </div>
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────

const BRAZIL_CENTER: [number, number] = [-15.77972, -47.92972]

export function ProjectsMapPage() {
  const [activeId, setActiveId]   = useState<string | null>(null)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [mapCenter, setMapCenter]  = useState<[number, number]>(BRAZIL_CENTER)
  const [mapZoom, setMapZoom]      = useState(4)

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['open-projects-map'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, description, city, state, budget_min, budget_max, deadline, created_at, latitude, longitude')
        .eq('status', 'open')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as MappedProject[]
    },
  })

  // Try to get user location to center map
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserCoords(coords)
        setMapCenter([coords.lat, coords.lng])
        setMapZoom(9)
      },
      () => { /* silent — map works without location */ },
      { timeout: 8000 }
    )
  }, [])

  const activeProject = projects.find((p) => p.id === activeId)

  function focusProject(p: MappedProject) {
    setActiveId(activeId === p.id ? null : p.id)
    if (activeId !== p.id) {
      setMapCenter([p.latitude, p.longitude])
      setMapZoom(13)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/dashboard/projetos" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mapa de Projetos</h1>
          <p className="text-sm text-slate-500">
            {isLoading ? 'Carregando...' : `${projects.length} projeto${projects.length !== 1 ? 's' : ''} com localização`}
          </p>
        </div>
      </div>

      {/* Info banner */}
      {!isLoading && projects.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <Map size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-600">Nenhum projeto com localização</p>
          <p className="text-sm text-slate-400 mt-1">
            Projetos aparecem no mapa quando o cliente define a localização ao criá-los.
          </p>
          <Link
            to="/dashboard/projetos"
            className="inline-flex items-center gap-2 mt-5 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors"
          >
            Ver lista de projetos
          </Link>
        </div>
      )}

      {/* Map + List */}
      {(isLoading || projects.length > 0) && (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Sidebar list */}
          <div className="lg:w-80 shrink-0 space-y-2">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {projects.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      active={activeId === p.id}
                      onClick={() => focusProject(p)}
                    />
                  ))}
                </div>

                {activeProject && (
                  <Link
                    to={`/dashboard/projeto/${activeProject.id}`}
                    className="block w-full text-center py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
                  >
                    Ver detalhes de "{activeProject.title.slice(0, 24)}{activeProject.title.length > 24 ? '…' : ''}"
                  </Link>
                )}

                {userCoords && (
                  <p className="text-xs text-green-600 flex items-center gap-1 px-1">
                    <Navigation size={11} /> Mapa centrado na sua localização
                  </p>
                )}
              </>
            )}
          </div>

          {/* Map */}
          <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 h-[480px]">
            <MapContainer
              center={BRAZIL_CENTER}
              zoom={4}
              style={{ width: '100%', height: '100%' }}
              zoomControl
            >
              <MapController center={mapCenter} zoom={mapZoom} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* User location */}
              {userCoords && (
                <Marker
                  position={[userCoords.lat, userCoords.lng]}
                  icon={createUserIcon()}
                />
              )}

              {/* Project markers */}
              {projects.map((p) => (
                <Marker
                  key={p.id}
                  position={[p.latitude, p.longitude]}
                  icon={createProjectIcon(activeId === p.id)}
                  eventHandlers={{ click: () => focusProject(p) }}
                >
                  <Popup>
                    <div className="text-sm space-y-1 min-w-[180px]">
                      <p className="font-bold text-slate-900 leading-snug">{p.title}</p>
                      {(p.city || p.state) && (
                        <p className="text-slate-500 text-xs flex items-center gap-1">
                          <MapPin size={10} />
                          {[p.city, p.state].filter(Boolean).join(' / ')}
                        </p>
                      )}
                      <p className="text-primary-600 text-xs font-semibold">
                        {formatBudget(p.budget_min, p.budget_max)}
                      </p>
                      <Link
                        to={`/dashboard/projeto/${p.id}`}
                        className="block text-center py-1 px-3 bg-primary-600 text-white rounded-lg text-xs font-semibold hover:bg-primary-700 transition-colors mt-2"
                      >
                        Ver projeto
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
