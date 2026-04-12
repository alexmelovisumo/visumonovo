import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Circle, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Navigation, Plus, X, Save } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { CitySelect } from '@/components/ui/city-select'
import { Select } from '@/components/ui/select'
import { BR_STATES } from '@/utils/constants'

// Fix leaflet default marker icons
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// ─── Map helpers ─────────────────────────────────────────────

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) })
  return null
}

function MapRecenter({ position }: { position: [number, number] }) {
  const map = useMap()
  useEffect(() => { map.setView(position) }, [position, map])
  return null
}

function MapZoom({ radius }: { radius: number }) {
  const map = useMap()
  useEffect(() => {
    const zoom = radius <= 20 ? 12 : radius <= 60 ? 10 : radius <= 120 ? 9 : radius <= 250 ? 8 : 7
    map.setZoom(zoom)
  }, [radius, map])
  return null
}

// ─── Page ─────────────────────────────────────────────────────

const DEFAULT_POS: [number, number] = [-29.1678, -51.1794] // Caxias do Sul, RS

export function LocationSetupPage() {
  const { user, profile, fetchProfile } = useAuthStore()

  const [city,   setCity]   = useState(profile?.city   ?? '')
  const [state,  setState]  = useState(profile?.state  ?? '')
  const [radius, setRadius] = useState(profile?.coverage_radius_km ?? 50)
  const [lat,    setLat]    = useState<number | null>(profile?.latitude  ?? null)
  const [lng,    setLng]    = useState<number | null>(profile?.longitude ?? null)

  const [extraCities, setExtraCities] = useState<string[]>(profile?.coverage_cities ?? [])
  const [newCity,      setNewCity]      = useState('')
  const [newCityState, setNewCityState] = useState('')

  const [saving,      setSaving]      = useState(false)
  const [addingCity,  setAddingCity]  = useState(false)
  const [geoLoading,  setGeoLoading]  = useState(false)

  useEffect(() => {
    if (!profile) return
    setCity(profile.city   ?? '')
    setState(profile.state ?? '')
    setRadius(profile.coverage_radius_km ?? 50)
    setLat(profile.latitude  ?? null)
    setLng(profile.longitude ?? null)
    setExtraCities(profile.coverage_cities ?? [])
  }, [profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const mapPosition: [number, number] = lat && lng ? [lat, lng] : DEFAULT_POS

  const handleMapClick = (clickLat: number, clickLng: number) => {
    setLat(clickLat)
    setLng(clickLng)
  }

  const handleGeolocate = () => {
    if (!navigator.geolocation) { toast.error('Geolocalização não suportada neste navegador.'); return }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setLat(latitude)
        setLng(longitude)
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=pt`)
          const data = await res.json()
          const addr = data.address ?? {}
          const cityName  = addr.city ?? addr.town ?? addr.village ?? addr.county ?? ''
          const stateCode = BR_STATES.find(
            (s) => s.name.toLowerCase() === (addr.state ?? '').toLowerCase()
          )?.uf ?? addr.state ?? ''
          if (cityName) setCity(cityName)
          if (stateCode) setState(stateCode)
          toast.success('Localização detectada!')
        } catch {
          toast.info('Coordenadas salvas. Preencha a cidade manualmente.')
        }
        setGeoLoading(false)
      },
      () => { toast.error('Não foi possível obter sua localização.'); setGeoLoading(false) }
    )
  }

  const addExtraCity = async () => {
    const trimmed = newCity.trim()
    if (!trimmed) { toast.error('Informe o nome da cidade.'); return }
    if (!newCityState) { toast.error('Selecione o estado da cidade.'); return }
    const entry = `${trimmed}|${newCityState}`
    if (extraCities.map((c) => c.toLowerCase()).includes(entry.toLowerCase())) {
      toast.error('Cidade já adicionada.'); return
    }
    const updated = [...extraCities, entry]
    setAddingCity(true)
    const { error } = await supabase
      .from('profiles')
      .update({ coverage_cities: updated })
      .eq('id', user!.id)
    setAddingCity(false)
    if (error) { toast.error('Erro ao salvar: ' + error.message); return }
    setExtraCities(updated)
    setNewCity('')
    setNewCityState('')
    await fetchProfile(user!.id)
    toast.success(`${trimmed} (${newCityState}) adicionada!`)
  }

  const removeExtraCity = async (c: string) => {
    const updated = extraCities.filter((x) => x !== c)
    setExtraCities(updated)
    const { error } = await supabase
      .from('profiles')
      .update({ coverage_cities: updated.length > 0 ? updated : null })
      .eq('id', user!.id)
    if (error) { toast.error('Erro ao remover: ' + error.message); return }
    await fetchProfile(user!.id)
    toast.success('Cidade removida.')
  }

  const handleSave = async () => {
    if (!city.trim() || !state.trim()) { toast.error('Informe sua cidade e estado.'); return }
    setSaving(true)

    // Auto-geocode the city if lat/lng not set via GPS or map click
    let saveLat = lat
    let saveLng = lng
    if (!saveLat || !saveLng) {
      try {
        const stateObj = BR_STATES.find((s) => s.uf === state.trim())
        const geoUrl = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city.trim())}&state=${encodeURIComponent(stateObj?.name ?? state.trim())}&country=Brazil&format=json&limit=1`
        const geoRes = await fetch(geoUrl, { headers: { 'Accept-Language': 'pt-BR' } })
        const geoData = await geoRes.json()
        if (geoData[0]) {
          saveLat = parseFloat(geoData[0].lat)
          saveLng = parseFloat(geoData[0].lon)
          setLat(saveLat)
          setLng(saveLng)
        }
      } catch { /* optional — save without coords if geocoding fails */ }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        city:               city.trim(),
        state:              state.trim(),
        coverage_radius_km: radius,
        coverage_cities:    extraCities.length > 0 ? extraCities : null,
        latitude:           saveLat,
        longitude:          saveLng,
        updated_at:         new Date().toISOString(),
      })
      .eq('id', user!.id)

    setSaving(false)
    if (error) { toast.error('Erro ao salvar: ' + error.message); return }
    await fetchProfile(user!.id)
    toast.success('Localização salva!')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Localização e área de atuação</h1>
        <p className="text-slate-500 text-sm mt-1">
          Configure onde você está e até onde atende. Projetos nessa área aparecerão para você.
        </p>
      </div>

      {/* Localização base */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-center gap-2 text-slate-800 font-semibold">
          <MapPin size={18} className="text-primary-600" /> Sua localização
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="state" required>Estado</Label>
            <Select
              id="state"
              value={state}
              onChange={(e) => { setState(e.target.value); setCity('') }}
            >
              <option value="">Selecione o estado</option>
              {BR_STATES.map((s) => (
                <option key={s.uf} value={s.uf}>{s.uf} — {s.name}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city" required>Cidade</Label>
            <CitySelect
              id="city"
              uf={state}
              value={city}
              onChange={(e) => setCity((e.target as HTMLSelectElement).value)}
            />
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGeolocate}
          isLoading={geoLoading}
          className="w-full"
        >
          <Navigation size={15} /> Usar minha localização atual (GPS)
        </Button>
      </div>

      {/* Raio de atuação + Mapa */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <MapPin size={18} className="text-primary-600" /> Raio de atendimento
          </div>
          <span className="text-primary-600 font-bold text-lg">{radius} km</span>
        </div>

        <input
          type="range"
          min={5}
          max={500}
          step={5}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="w-full accent-primary-600"
        />

        <div className="flex justify-between text-xs text-slate-400">
          <span>5 km</span>
          <span>100 km</span>
          <span>250 km</span>
          <span>500 km</span>
        </div>

        <p className="text-sm text-slate-500">
          Você receberá projetos num raio de <strong>{radius} km</strong> a partir de <strong>{city || 'sua cidade'}</strong>.
          {!lat && !lng && (
            <span className="text-amber-500 ml-1">Clique no mapa para posicionar ou use o GPS.</span>
          )}
        </p>

        {/* Mapa interativo */}
        <div className="h-80 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
          <MapContainer
            center={mapPosition}
            zoom={10}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onMapClick={handleMapClick} />
            <MapRecenter position={mapPosition} />
            <MapZoom radius={radius} />
            <Marker position={mapPosition} />
            <Circle
              center={mapPosition}
              radius={radius * 1000}
              pathOptions={{
                fillColor:   '#0284c7',
                fillOpacity: 0.15,
                color:       '#0284c7',
                weight:      2,
              }}
            />
          </MapContainer>
        </div>
        <p className="text-xs text-slate-400 text-center">
          Clique no mapa para mover o ponto central da sua área de atuação
        </p>
      </div>

      {/* Cidades adicionais */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div>
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <Plus size={18} className="text-primary-600" /> Cidades adicionais
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Atende em cidades fora do raio? Adicione-as aqui.
          </p>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={newCityState}
              onChange={(e) => { setNewCityState(e.target.value); setNewCity('') }}
            >
              <option value="">Selecione o estado</option>
              {BR_STATES.map((s) => (
                <option key={s.uf} value={s.uf}>{s.uf} — {s.name}</option>
              ))}
            </Select>
            <CitySelect
              uf={newCityState}
              value={newCity}
              onChange={(e) => setNewCity((e.target as HTMLSelectElement).value)}
            />
          </div>
          <Button type="button" variant="outline" onClick={addExtraCity} isLoading={addingCity} className="w-full">
            <Plus size={16} /> Adicionar cidade
          </Button>
        </div>

        {extraCities.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {extraCities.map((c) => {
              const [cityName, uf] = c.split('|')
              const label = uf ? `${cityName} (${uf})` : cityName
              return (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-medium border border-primary-200"
                >
                  <MapPin size={12} /> {label}
                  <button
                    type="button"
                    onClick={() => removeExtraCity(c)}
                    className="ml-1 text-primary-400 hover:text-primary-700 transition-colors"
                  >
                    <X size={13} />
                  </button>
                </span>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-xl">
            Nenhuma cidade adicional cadastrada.
          </p>
        )}
      </div>

      <Button onClick={handleSave} isLoading={saving} className="w-full">
        <Save size={16} /> Salvar configurações
      </Button>
    </div>
  )
}
