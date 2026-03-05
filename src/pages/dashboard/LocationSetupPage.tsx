import { useState, useEffect } from 'react'
import { MapPin, Navigation, Plus, X, Save } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BR_STATES } from '@/utils/constants'

export function LocationSetupPage() {
  const { user, profile, fetchProfile } = useAuthStore()

  // Form state — inicializa com valores do perfil
  const [city,   setCity]   = useState(profile?.city   ?? '')
  const [state,  setState]  = useState(profile?.state  ?? '')
  const [radius, setRadius] = useState(profile?.coverage_radius_km ?? 50)
  const [lat,    setLat]    = useState<number | null>(profile?.latitude  ?? null)
  const [lng,    setLng]    = useState<number | null>(profile?.longitude ?? null)

  // Cidades adicionais fora do raio
  const [extraCities, setExtraCities] = useState<string[]>(profile?.coverage_cities ?? [])
  const [newCity, setNewCity] = useState('')

  const [saving,   setSaving]   = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)

  // Sincroniza quando profile carrega
  useEffect(() => {
    if (!profile) return
    setCity(profile.city   ?? '')
    setState(profile.state ?? '')
    setRadius(profile.coverage_radius_km ?? 50)
    setLat(profile.latitude  ?? null)
    setLng(profile.longitude ?? null)
    setExtraCities(profile.coverage_cities ?? [])
  }, [profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGeolocate = () => {
    if (!navigator.geolocation) { toast.error('Geolocalização não suportada neste navegador.'); return }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setLat(latitude)
        setLng(longitude)
        // Reverse geocode via nominatim
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

  const addExtraCity = () => {
    const trimmed = newCity.trim()
    if (!trimmed) return
    if (extraCities.includes(trimmed)) { toast.error('Cidade já adicionada.'); return }
    setExtraCities((prev) => [...prev, trimmed])
    setNewCity('')
  }

  const removeExtraCity = (c: string) => {
    setExtraCities((prev) => prev.filter((x) => x !== c))
  }

  const handleSave = async () => {
    if (!city.trim() || !state.trim()) { toast.error('Informe sua cidade e estado.'); return }
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        city:               city.trim(),
        state:              state.trim(),
        coverage_radius_km: radius,
        coverage_cities:    extraCities.length > 0 ? extraCities : null,
        latitude:           lat,
        longitude:          lng,
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
            <Label htmlFor="city" required>Cidade</Label>
            <Input
              id="city"
              placeholder="Ex: Caxias do Sul"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state" required>Estado</Label>
            <select
              id="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
            >
              <option value="">Selecione</option>
              {BR_STATES.map((s) => (
                <option key={s.uf} value={s.uf}>{s.uf} — {s.name}</option>
              ))}
            </select>
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

        {lat && lng && (
          <p className="text-xs text-slate-400 text-center">
            Coordenadas salvas: {lat.toFixed(4)}, {lng.toFixed(4)}
          </p>
        )}
      </div>

      {/* Raio de atuação */}
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

        <div className="flex gap-2">
          <Input
            placeholder="Ex: Porto Alegre"
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExtraCity() } }}
          />
          <Button type="button" variant="outline" onClick={addExtraCity}>
            <Plus size={16} /> Adicionar
          </Button>
        </div>

        {extraCities.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {extraCities.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-medium border border-primary-200"
              >
                <MapPin size={12} /> {c}
                <button
                  type="button"
                  onClick={() => removeExtraCity(c)}
                  className="ml-1 text-primary-400 hover:text-primary-700 transition-colors"
                >
                  <X size={13} />
                </button>
              </span>
            ))}
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
