import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, ChevronRight, ChevronLeft, Building2, Users, Package, Wrench, Briefcase } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { BR_STATES, SPECIALTIES, USER_TYPE_LABELS } from '@/utils/constants'
import type { UserType } from '@/types'

// ─── Config por tipo ───────────────────────────────────────────

const TYPE_ICONS: Record<UserType, React.ReactNode> = {
  empresa:            <Building2 size={44} strokeWidth={1.5} />,
  profissional:       <Users     size={44} strokeWidth={1.5} />,
  fornecedor:         <Package   size={44} strokeWidth={1.5} />,
  fornecedor_empresa: <Package   size={44} strokeWidth={1.5} />,
  empresa_prestadora: <Wrench    size={44} strokeWidth={1.5} />,
  admin:              <Briefcase size={44} strokeWidth={1.5} />,
}

const TYPE_WELCOME: Record<UserType, { title: string; body: string }> = {
  empresa:            { title: 'Bem-vindo ao Visumo!', body: 'Encontre profissionais e fornecedores de comunicação visual para seus projetos.' },
  profissional:       { title: 'Bem-vindo ao Visumo!', body: 'Mostre seu trabalho, conecte-se com empresas e conquiste novos projetos.' },
  fornecedor:         { title: 'Bem-vindo ao Visumo!', body: 'Exiba seus produtos e alcance profissionais e empresas do setor.' },
  fornecedor_empresa: { title: 'Bem-vindo ao Visumo!', body: 'Gerencie produtos e projetos de comunicação visual em um só lugar.' },
  empresa_prestadora: { title: 'Bem-vindo ao Visumo!', body: 'Preste serviços, gerencie projetos e conecte-se com seus clientes.' },
  admin:              { title: 'Painel Admin', body: 'Configure sua conta de administrador para começar a usar o Visumo.' },
}

// ─── Helpers ───────────────────────────────────────────────────

function isProfType(t: UserType) {
  return t === 'profissional' || t === 'empresa_prestadora'
}
function isCompanyType(t: UserType) {
  return t === 'empresa' || t === 'fornecedor' || t === 'fornecedor_empresa'
}

function buildSteps(userType: UserType) {
  const base = ['welcome', 'name', 'location']
  if (isProfType(userType))  return [...base, 'specialty', 'done']
  if (isCompanyType(userType)) return [...base, 'company', 'done']
  return [...base, 'done'] // admin
}

// ─── Sub-components ───────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? 'w-6 h-2 bg-white'
              : i < current
              ? 'w-2 h-2 bg-white/60'
              : 'w-2 h-2 bg-white/30'
          }`}
        />
      ))}
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition'

// ─── Main Component ───────────────────────────────────────────

export function OnboardingFlow() {
  const { profile, fetchProfile } = useAuthStore()

  const [open, setOpen]   = useState(false)
  const [show, setShow]   = useState(true)   // controls fade transition
  const [step, setStep]   = useState(0)
  const [saving, setSaving] = useState(false)

  // Form state
  const [fullName,  setFullName]  = useState('')
  const [phone,     setPhone]     = useState('')
  const [city,      setCity]      = useState('')
  const [state,     setState]     = useState('')
  const [company,   setCompany]   = useState('')
  const [bio,       setBio]       = useState('')
  const [specs,     setSpecs]     = useState<string[]>([])

  useEffect(() => {
    if (profile && !profile.full_name) setOpen(true)
  }, [profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open || !profile) return null

  const userType = profile.user_type
  const steps    = buildSteps(userType)
  const current  = steps[step]
  const isLast   = step === steps.length - 2  // last data step before 'done'
  const isDone   = current === 'done'

  // ── Navigation with fade transition ──

  const transition = useCallback((fn: () => void) => {
    setShow(false)
    setTimeout(() => { fn(); setShow(true) }, 180)
  }, [])

  function goNext() {
    if (current === 'location') {
      if (!city.trim()) { toast.error('Informe sua cidade.'); return }
      if (!state) { toast.error('Selecione seu estado.'); return }
    }
    if (isLast) { handleSave(); return }
    transition(() => setStep((s) => s + 1))
  }

  function goBack() {
    transition(() => setStep((s) => s - 1))
  }

  // ── Save ──

  async function handleSave() {
    setSaving(true)
    try {
      const patch: Record<string, unknown> = {
        full_name: fullName.trim() || null,
        phone:     phone.trim() || null,
        city:      city.trim() || null,
        state:     state || null,
      }
      if (isProfType(userType)) {
        patch.bio         = bio.trim() || null
        patch.specialties = specs
      }
      if (isCompanyType(userType)) {
        patch.company_name = company.trim() || null
      }

      const profileId = profile!.id
      const { error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', profileId)

      if (error) throw error

      await fetchProfile(profileId)
      transition(() => setStep((s) => s + 1))
    } catch {
      // keep on same step
    } finally {
      setSaving(false)
    }
  }

  function toggleSpec(s: string) {
    setSpecs((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }

  // ── Can proceed ──

  const canNext =
    current === 'welcome'   ? true :
    current === 'name'      ? fullName.trim().length >= 2 :
    true

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">

      {/* ── Header gradient ── */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 px-6 safe-top pb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <img src="/icons/icon-192x192.png" alt="Visumo" className="w-7 h-7 rounded-lg" />
            <span className="text-white font-bold text-lg tracking-tight">Visumo</span>
          </div>
          <span className="text-primary-200 text-xs font-medium">
            {USER_TYPE_LABELS[userType]}
          </span>
        </div>
        {!isDone && (
          <ProgressDots
            total={steps.length - 1}
            current={step}
          />
        )}
      </div>

      {/* ── Content area ── */}
      <div className="flex-1 overflow-y-auto">
        <div
          className="px-6 pt-8 pb-6 space-y-6"
          style={{
            opacity:   show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 180ms ease, transform 180ms ease',
          }}
        >
          {/* WELCOME */}
          {current === 'welcome' && (
            <div className="flex flex-col items-center text-center gap-6 pt-4">
              <div className="w-24 h-24 rounded-3xl bg-primary-50 flex items-center justify-center text-primary-600">
                {TYPE_ICONS[userType]}
              </div>
              <div className="space-y-3">
                <h1 className="text-2xl font-bold text-slate-900">
                  {TYPE_WELCOME[userType].title}
                </h1>
                <p className="text-slate-500 leading-relaxed">
                  {TYPE_WELCOME[userType].body}
                </p>
              </div>
              <p className="text-xs text-slate-400">
                Vamos configurar seu perfil em poucos passos.
              </p>
            </div>
          )}

          {/* NAME */}
          {current === 'name' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Como você se chama?</h2>
                <p className="text-slate-500 text-sm mt-1">Esse nome aparecerá no seu perfil público.</p>
              </div>
              <Field label="Nome completo *">
                <input
                  className={inputCls}
                  placeholder="Seu nome ou empresa"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoFocus
                />
              </Field>
              <Field label="Telefone / WhatsApp">
                <input
                  className={inputCls}
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                />
              </Field>
            </div>
          )}

          {/* LOCATION */}
          {current === 'location' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Onde você está?</h2>
                <p className="text-slate-500 text-sm mt-1">Ajuda a conectar você com clientes e parceiros próximos.</p>
              </div>
              <Field label="Cidade">
                <input
                  className={inputCls}
                  placeholder="Ex: São Paulo"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </Field>
              <Field label="Estado">
                <select
                  className={inputCls + ' appearance-none'}
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                >
                  <option value="">Selecione o estado</option>
                  {BR_STATES.map((s) => (
                    <option key={s.uf} value={s.uf}>{s.name}</option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {/* COMPANY */}
          {current === 'company' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Sua empresa</h2>
                <p className="text-slate-500 text-sm mt-1">O nome que aparecerá no seu perfil para clientes e parceiros.</p>
              </div>
              <Field label="Nome da empresa">
                <input
                  className={inputCls}
                  placeholder="Razão social ou nome fantasia"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </Field>
            </div>
          )}

          {/* SPECIALTY */}
          {current === 'specialty' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Suas especialidades</h2>
                <p className="text-slate-500 text-sm mt-1">Selecione o que você oferece. Isso facilita encontrarem você.</p>
              </div>
              <Field label="Bio / Apresentação">
                <textarea
                  className={inputCls + ' h-24 py-3 resize-none'}
                  placeholder="Conte um pouco sobre você e seu trabalho..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </Field>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-3">Especialidades</p>
                <div className="flex flex-wrap gap-2">
                  {SPECIALTIES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSpec(s)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        specs.includes(s)
                          ? 'bg-primary-600 text-white'
                          : 'bg-slate-100 text-slate-600 active:bg-slate-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* DONE */}
          {current === 'done' && (
            <div className="flex flex-col items-center text-center gap-6 pt-8">
              <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 size={52} className="text-green-500" strokeWidth={1.5} />
              </div>
              <div className="space-y-3">
                <h1 className="text-2xl font-bold text-slate-900">Perfil criado!</h1>
                <p className="text-slate-500 leading-relaxed">
                  Tudo pronto. Você já pode aproveitar o Visumo ao máximo.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="px-6 safe-bottom pt-4 border-t border-slate-100 bg-white">
        {isDone ? (
          <button
            className="w-full h-14 rounded-2xl bg-primary-600 text-white font-semibold text-base active:bg-primary-700 transition-colors"
            onClick={() => setOpen(false)}
          >
            Começar agora
          </button>
        ) : (
          <div className="flex gap-3">
            {step > 0 && (
              <button
                className="h-14 px-5 rounded-2xl border border-slate-200 text-slate-600 font-medium active:bg-slate-50 transition-colors"
                onClick={goBack}
                disabled={saving}
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <button
              className={`flex-1 h-14 rounded-2xl font-semibold text-base transition-colors flex items-center justify-center gap-2 ${
                canNext
                  ? 'bg-primary-600 text-white active:bg-primary-700'
                  : 'bg-slate-100 text-slate-400'
              }`}
              onClick={goNext}
              disabled={!canNext || saving}
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isLast ? (
                'Concluir'
              ) : (
                <>Próximo <ChevronRight size={18} /></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
