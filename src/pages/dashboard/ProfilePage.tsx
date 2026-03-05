import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  User, Camera, Save, Plus, Trash2, Globe, Linkedin,
  MapPin, Phone, FileText, Image as ImageIcon, Upload, Navigation, ExternalLink, CheckCircle2, XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { USER_TYPE_LABELS, SPECIALTIES } from '@/utils/constants'
import type { PortfolioImage } from '@/types'

// ─── Schema ──────────────────────────────────────────────────

const profileSchema = z.object({
  full_name:          z.string().min(2, 'Nome obrigatório'),
  phone:              z.string().optional(),
  company_name:       z.string().optional(),
  document_number:    z.string().optional(),
  bio:                z.string().max(500, 'Máx. 500 caracteres').optional(),
  website:            z.string().url('URL inválida').optional().or(z.literal('')),
  linkedin:           z.string().optional(),
  address:            z.string().optional(),
  city:               z.string().optional(),
  state:              z.string().optional(),
  postal_code:        z.string().optional(),
  coverage_radius_km: z.string().optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

// ─── Portfolio Section ────────────────────────────────────────

function PortfolioSection({ userId }: { userId: string }) {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const { data: images = [], isLoading } = useQuery({
    queryKey: ['portfolio', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_images')
        .select('*')
        .eq('profile_id', userId)
        .order('display_order', { ascending: true })
      if (error) throw error
      return data as PortfolioImage[]
    },
  })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)

    let added = 0
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} muito grande (máx. 5 MB)`); continue }

      const ext = file.name.split('.').pop() ?? 'jpg'
      const filePath = `${userId}/${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('portfolio-images')
        .upload(filePath, file)

      if (upErr) { toast.error(`Erro ao enviar ${file.name}: ${upErr.message}`); continue }

      const { data: { publicUrl } } = supabase.storage
        .from('portfolio-images')
        .getPublicUrl(filePath)

      const title = file.name.replace(/\.[^/.]+$/, '')

      const { error: dbErr } = await supabase.from('portfolio_images').insert({
        profile_id:    userId,
        image_url:     publicUrl,
        title,
        display_order: images.length + added,
      })

      if (dbErr) { toast.error(`Erro ao salvar ${file.name}: ${dbErr.message}`); continue }
      added++
    }

    setUploading(false)
    queryClient.invalidateQueries({ queryKey: ['portfolio', userId] })
    if (fileRef.current) fileRef.current.value = ''
    if (added > 0) toast.success(`${added} imagem${added > 1 ? 'ns' : ''} adicionada${added > 1 ? 's' : ''} ao portfólio!`)
  }

  const handleDelete = async (img: PortfolioImage) => {
    const { error } = await supabase.from('portfolio_images').delete().eq('id', img.id)
    if (error) { toast.error('Erro ao remover imagem'); return }
    queryClient.invalidateQueries({ queryKey: ['portfolio', userId] })
    toast.success('Imagem removida')
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <ImageIcon size={16} /> Portfólio
        </h2>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <span className="flex items-center gap-1.5">
                <div className="w-3 h-3 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                Enviando...
              </span>
            ) : (
              <><Upload size={14} /> Adicionar imagens</>
            )}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : images.length === 0 ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-primary-300 hover:bg-primary-50 transition-all group"
        >
          <Plus size={28} className="mx-auto text-slate-300 group-hover:text-primary-400 mb-2" />
          <p className="text-sm text-slate-400 group-hover:text-primary-600">Adicione fotos do seu trabalho</p>
        </button>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map((img) => (
            <div key={img.id} className="relative group aspect-square">
              <img
                src={img.image_url}
                alt={img.title ?? 'Portfolio'}
                className="w-full h-full object-cover rounded-xl border border-slate-200"
              />
              <button
                onClick={() => {
                  if (confirm('Remover esta imagem do portfólio?')) handleDelete(img)
                }}
                className="absolute top-1.5 right-1.5 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button
            onClick={() => fileRef.current?.click()}
            className="aspect-square border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1.5 hover:border-primary-300 hover:bg-primary-50 transition-all text-slate-400 hover:text-primary-600"
          >
            <Plus size={20} />
            <span className="text-xs font-medium">Adicionar</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Avatar Upload ────────────────────────────────────────────

function AvatarUpload({ currentUrl, userId, onUploaded }: { currentUrl: string | null; userId: string; onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return }
    if (file.size > 2 * 1024 * 1024) { toast.error('Imagem muito grande (máx. 2 MB)'); return }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const filePath = `${userId}/avatar.${ext}`

      const { error } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, { upsert: true })

      if (error) { toast.error('Erro no upload: ' + error.message); return }

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath)

      const finalUrl = `${publicUrl}?t=${Date.now()}`

      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ profile_image_url: finalUrl })
        .eq('id', userId)

      if (dbErr) { toast.error('Foto enviada mas não salva. Clique em Salvar.') }
      else { toast.success('Foto de perfil atualizada!') }

      onUploaded(finalUrl)
    } catch (err: unknown) {
      toast.error('Falha no upload: ' + ((err as { message?: string })?.message ?? 'erro desconhecido'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const initials = '?'

  return (
    <div className="relative inline-block">
      {currentUrl ? (
        <img src={currentUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md" />
      ) : (
        <div className="w-24 h-24 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-3xl font-bold border-4 border-white shadow-md">
          {initials}
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="absolute bottom-0 right-0 bg-primary-600 text-white rounded-full p-2 shadow-md hover:bg-primary-700 transition-colors disabled:opacity-50"
      >
        {uploading
          ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <Camera size={14} />
        }
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function ProfilePage() {
  const { user, profile, fetchProfile } = useAuthStore()
  const queryClient = useQueryClient()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.profile_image_url ?? null)
  const [geoSaving, setGeoSaving] = useState(false)
  const [geoSaved, setGeoSaved] = useState(false)
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(profile?.specialties ?? [])

  const toggleSpecialty = (s: string) =>
    setSelectedSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )

  const captureLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocalização não suportada neste navegador'); return }
    setGeoSaving(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { error } = await supabase
          .from('profiles')
          .update({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
          .eq('id', user!.id)
        if (error) { toast.error('Erro ao salvar localização') }
        else { toast.success('Localização GPS salva!'); setGeoSaved(true) }
        setGeoSaving(false)
      },
      () => { toast.error('Permissão de localização negada'); setGeoSaving(false) }
    )
  }

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name:          profile?.full_name ?? '',
      phone:              profile?.phone ?? '',
      company_name:       profile?.company_name ?? '',
      document_number:    profile?.document_number ?? '',
      bio:                profile?.bio ?? '',
      website:            profile?.website ?? '',
      linkedin:           profile?.linkedin ?? '',
      address:            profile?.address ?? '',
      city:               profile?.city ?? '',
      state:              profile?.state ?? '',
      postal_code:        profile?.postal_code ?? '',
      coverage_radius_km: profile?.coverage_radius_km?.toString() ?? '',
    },
  })

  const save = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const updates: Record<string, unknown> = {
        full_name:          data.full_name,
        phone:              data.phone || null,
        company_name:       data.company_name || null,
        document_number:    data.document_number || null,
        bio:                data.bio || null,
        website:            data.website || null,
        linkedin:           data.linkedin || null,
        address:            data.address || null,
        city:               data.city || null,
        state:              data.state || null,
        postal_code:        data.postal_code || null,
        coverage_radius_km: data.coverage_radius_km ? parseInt(data.coverage_radius_km) : null,
        specialties:        isProfissional ? selectedSpecialties : [],
        profile_image_url:  avatarUrl,
        updated_at:         new Date().toISOString(),
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user!.id)

      if (error) throw error
    },
    onSuccess: async () => {
      await fetchProfile(user!.id)
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
      toast.success('Perfil atualizado!')
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message ?? 'Erro ao salvar'
      toast.error(msg)
    },
  })

  const toggleAvailability = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_available: !profile?.is_available })
        .eq('id', user!.id)
      if (error) throw error
    },
    onSuccess: () => fetchProfile(user!.id),
    onError: () => toast.error('Erro ao atualizar disponibilidade'),
  })

  const isProfissional = profile?.user_type === 'profissional' || profile?.user_type === 'empresa_prestadora'
  const isCompany      = profile?.user_type === 'empresa' || profile?.user_type === 'fornecedor_empresa'

  if (!profile || !user) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const publicProfileHref =
    profile.user_type === 'profissional' || profile.user_type === 'empresa_prestadora'
      ? `/profissional/${user.id}`
      : profile.user_type === 'fornecedor'
        ? `/fornecedor/${user.id}`
        : profile.user_type === 'empresa' || profile.user_type === 'fornecedor_empresa'
          ? `/empresa/${user.id}`
          : null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meu Perfil</h1>
          <p className="text-sm text-slate-500 mt-1">Mantenha suas informações atualizadas</p>
        </div>
        {publicProfileHref && (
          <Link
            to={publicProfileHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            <ExternalLink size={14} /> Ver perfil público
          </Link>
        )}
      </div>

      {/* Avatar + basic info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-5 mb-6">
          <AvatarUpload
            currentUrl={avatarUrl}
            userId={user.id}
            onUploaded={(url) => setAvatarUrl(url)}
          />
          <div>
            <p className="font-bold text-slate-900 text-lg">{profile.full_name ?? profile.email}</p>
            <p className="text-sm text-primary-600 font-medium">{USER_TYPE_LABELS[profile.user_type]}</p>
            <p className="text-xs text-slate-400 mt-0.5">{profile.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-5">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="full_name" required>
              <User size={13} className="inline mr-1" />
              Nome completo
            </Label>
            <Input id="full_name" error={errors.full_name?.message} {...register('full_name')} />
          </div>

          {/* Empresa (opcional para certos tipos) */}
          {isCompany && (
            <div className="space-y-1.5">
              <Label htmlFor="company_name">Nome da empresa</Label>
              <Input id="company_name" placeholder="Razão social ou nome fantasia" {...register('company_name')} />
            </div>
          )}

          {/* Telefone */}
          <div className="space-y-1.5">
            <Label htmlFor="phone">
              <Phone size={13} className="inline mr-1" />
              Telefone / WhatsApp
            </Label>
            <Input id="phone" type="tel" placeholder="(11) 99999-9999" {...register('phone')} />
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <Label htmlFor="bio">
              <FileText size={13} className="inline mr-1" />
              Sobre você {isProfissional && <span className="text-slate-400 font-normal">(apresentação pública)</span>}
            </Label>
            <textarea
              id="bio"
              rows={3}
              placeholder={isProfissional ? 'Descreva suas especialidades e experiência...' : 'Fale um pouco sobre você ou sua empresa...'}
              className={cn(
                'flex w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 resize-none',
                'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors',
                errors.bio ? 'border-red-400' : 'border-slate-300'
              )}
              {...register('bio')}
            />
            {errors.bio && <p className="text-xs text-red-500">{errors.bio.message}</p>}
          </div>

          {/* Localização */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <MapPin size={13} /> Localização
              </p>
              <button
                type="button"
                onClick={captureLocation}
                disabled={geoSaving}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-primary-200 text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-50"
              >
                {geoSaving
                  ? <div className="w-3 h-3 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                  : <Navigation size={11} />
                }
                {geoSaved ? 'GPS salvo ✓' : 'Usar minha localização'}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Input placeholder="Cidade" {...register('city')} />
              </div>
              <Input placeholder="UF" maxLength={2} {...register('state')} />
            </div>
          </div>

          {/* Raio de atendimento (profissionais) */}
          {isProfissional && (
            <div className="space-y-1.5">
              <Label htmlFor="coverage_radius_km">Raio de atendimento (km)</Label>
              <Input
                id="coverage_radius_km"
                type="number"
                min="0"
                placeholder="Ex: 50"
                {...register('coverage_radius_km')}
              />
            </div>
          )}

          {/* Especialidades (profissionais) */}
          {isProfissional && (
            <div className="space-y-2">
              <Label>Especialidades</Label>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSpecialty(s)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      selectedSpecialties.includes(s)
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-primary-400 hover:text-primary-600'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {selectedSpecialties.length > 0 && (
                <p className="text-xs text-slate-400">{selectedSpecialties.length} especialidade{selectedSpecialties.length !== 1 ? 's' : ''} selecionada{selectedSpecialties.length !== 1 ? 's' : ''}</p>
              )}
            </div>
          )}

          {/* Links */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="website">
                <Globe size={13} className="inline mr-1" />
                Website
              </Label>
              <Input
                id="website"
                type="url"
                placeholder="https://seusite.com.br"
                error={errors.website?.message}
                {...register('website')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="linkedin">
                <Linkedin size={13} className="inline mr-1" />
                LinkedIn
              </Label>
              <Input
                id="linkedin"
                placeholder="linkedin.com/in/seuperfil"
                {...register('linkedin')}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <Button
              type="submit"
              className="w-full"
              isLoading={save.isPending}
              disabled={save.isPending}
            >
              <Save size={16} /> Salvar alterações
            </Button>
          </div>
        </form>
      </div>

      {/* Disponibilidade (profissionais) */}
      {isProfissional && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Disponibilidade</h2>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {profile?.is_available
                ? <CheckCircle2 size={20} className="text-green-500 shrink-0" />
                : <XCircle size={20} className="text-slate-400 shrink-0" />
              }
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {profile?.is_available ? 'Disponível para novos projetos' : 'Indisponível no momento'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {profile?.is_available
                    ? 'Empresas podem te encontrar e convidar para projetos.'
                    : 'Seu perfil continua visível, mas indicará que está ocupado.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => toggleAvailability.mutate()}
              disabled={toggleAvailability.isPending}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none',
                profile?.is_available ? 'bg-green-500' : 'bg-slate-300'
              )}
            >
              <span className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                profile?.is_available ? 'translate-x-6' : 'translate-x-1'
              )} />
            </button>
          </div>
        </div>
      )}

      {/* Portfolio (profissional / empresa_prestadora) */}
      {isProfissional && <PortfolioSection userId={user.id} />}
    </div>
  )
}
