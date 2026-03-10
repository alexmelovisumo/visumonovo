import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  PlusCircle, Search, FolderOpen, Handshake,
  Package, AlertCircle, CheckCircle2, Clock,
  TrendingUp, Eye, MessageSquare, ArrowRight,
  MapPin, BadgeCheck, Users, Briefcase, UserCircle,
  Bell, FileCheck, Star, CalendarClock,
} from 'lucide-react'
import { formatDistanceToNow, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuthStore } from '@/stores/authStore'
import { useSubscription, getDaysUntilExpiry } from '@/hooks/useSubscription'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { NotificationType } from '@/types'

// ─── Stat Card ───────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  color: string
  to?: string
}

function StatCard({ label, value, icon, color, to }: StatCardProps) {
  const inner = (
    <div className={cn(
      'flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm',
      to && 'hover:border-primary-300 hover:shadow-md transition-all cursor-pointer'
    )}>
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', color)}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  )
  return to ? <Link to={to}>{inner}</Link> : <div>{inner}</div>
}

// ─── Quick Action ─────────────────────────────────────────────

interface QuickActionProps {
  to: string
  icon: React.ReactNode
  label: string
  description: string
  color: string
}

function QuickAction({ to, icon, label, description, color }: QuickActionProps) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:border-primary-300 hover:shadow-md transition-all group"
    >
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', color)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 text-sm">{label}</p>
        <p className="text-xs text-slate-500 truncate">{description}</p>
      </div>
      <ArrowRight size={16} className="text-slate-300 group-hover:text-primary-400 transition-colors shrink-0" />
    </Link>
  )
}

// ─── Profile Completeness Widget ─────────────────────────────

interface CompletionItem {
  label: string
  done: boolean
  to: string
}

function buildCompletionItems(profile: import('@/types').Profile): CompletionItem[] {
  const isProfOrEmpPrest = profile.user_type === 'profissional' || profile.user_type === 'empresa_prestadora'

  const base: CompletionItem[] = [
    { label: 'Adicione seu nome completo',    done: !!profile.full_name,           to: '/dashboard/perfil' },
    { label: 'Adicione uma foto de perfil',   done: !!profile.profile_image_url,   to: '/dashboard/perfil' },
    { label: 'Escreva uma bio',               done: !!profile.bio,                 to: '/dashboard/perfil' },
    { label: 'Adicione seu telefone',         done: !!profile.phone,               to: '/dashboard/perfil' },
    { label: 'Defina sua cidade / estado',    done: !!profile.city && !!profile.state, to: '/dashboard/localizacao' },
  ]

  if (isProfOrEmpPrest) {
    base.push(
      { label: 'Adicione especialidades',          done: profile.specialties?.length > 0,      to: '/dashboard/perfil' },
      { label: 'Defina raio de atendimento',       done: !!profile.coverage_radius_km,          to: '/dashboard/perfil' },
      { label: 'Adicione um link profissional',    done: !!profile.website || !!profile.linkedin, to: '/dashboard/perfil' },
    )
  }

  return base
}

function ProfileCompletenessWidget() {
  const { profile } = useAuthStore()
  if (!profile) return null

  const items = buildCompletionItems(profile)
  const done  = items.filter((i) => i.done).length
  const total = items.length
  const pct   = Math.round((done / total) * 100)

  if (pct === 100) return null

  const missing = items.filter((i) => !i.done)

  return (
    <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-primary-800 flex items-center gap-2">
          <UserCircle size={16} /> Perfil {pct}% completo
        </p>
        <span className="text-xs font-bold text-primary-700">{done}/{total}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-primary-200 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-primary-600 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Missing items (max 3) */}
      <ul className="space-y-1">
        {missing.slice(0, 3).map((item) => (
          <li key={item.label}>
            <Link
              to={item.to}
              className="flex items-center gap-2 text-xs text-primary-700 hover:text-primary-900 hover:underline"
            >
              <span className="w-4 h-4 rounded-full border border-primary-400 shrink-0" />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      {missing.length > 3 && (
        <p className="text-xs text-primary-500 mt-1.5">
          +{missing.length - 3} item{missing.length - 3 > 1 ? 'ns' : ''} restante{missing.length - 3 > 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

// ─── Subscription Banner ──────────────────────────────────────

function SubscriptionBanner() {
  const { data: sub } = useSubscription()

  if (!sub) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <AlertCircle size={20} className="text-amber-600 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800">Sem assinatura ativa</p>
          <p className="text-xs text-amber-600">Escolha um plano para acessar todos os recursos.</p>
        </div>
        <Link to="/escolher-plano">
          <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0">
            Ver planos
          </Button>
        </Link>
      </div>
    )
  }

  if (sub.status === 'pending') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <Clock size={20} className="text-amber-600 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800">Pagamento pendente</p>
          <p className="text-xs text-amber-600">Plano {sub.plan?.display_name} aguardando confirmação do pagamento.</p>
        </div>
        <Link to="/dashboard/aguardando-pagamento">
          <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0">
            Ver status
          </Button>
        </Link>
      </div>
    )
  }

  const days = getDaysUntilExpiry(sub)

  if (sub.status === 'active' || sub.status === 'trial') {
    if (days !== null && days <= 7) {
      return (
        <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <AlertCircle size={20} className="text-orange-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-800">Assinatura expirando em {days} dias</p>
            <p className="text-xs text-orange-600">Renove para continuar com acesso completo.</p>
          </div>
          <Link to="/dashboard/renovar-assinatura">
            <Button size="sm" className="shrink-0">Renovar</Button>
          </Link>
        </div>
      )
    }

    // Active and healthy
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
        <CheckCircle2 size={20} className="text-green-600 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-green-800">
            Plano {sub.plan?.display_name} ativo
            {sub.status === 'trial' && ' (Trial)'}
          </p>
          {days !== null && (
            <p className="text-xs text-green-600">Válido por mais {days} dias.</p>
          )}
        </div>
        <Badge variant="success">{sub.plan?.price_monthly === 0 ? 'Grátis' : 'Pago'}</Badge>
      </div>
    )
  }

  if (sub.status === 'expired' || sub.status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
        <AlertCircle size={20} className="text-red-600 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-red-800">Assinatura {sub.status === 'expired' ? 'expirada' : 'cancelada'}</p>
          <p className="text-xs text-red-600">Renove para recuperar acesso aos recursos.</p>
        </div>
        <Link to="/escolher-plano">
          <Button size="sm" className="shrink-0">Renovar</Button>
        </Link>
      </div>
    )
  }

  return null
}

// ─── Upcoming Deadlines Widget ───────────────────────────────

function UpcomingDeadlinesWidget() {
  const { user } = useAuthStore()

  const { data: upcoming = [] } = useQuery({
    queryKey: ['upcoming-deadlines', user?.id],
    queryFn: async () => {
      const in14 = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      const today = new Date().toISOString()
      const { data } = await supabase
        .from('projects')
        .select('id, title, deadline, status')
        .eq('client_id', user!.id)
        .not('deadline', 'is', null)
        .gte('deadline', today)
        .lte('deadline', in14)
        .not('status', 'in', '("completed","cancelled")')
        .order('deadline', { ascending: true })
        .limit(5)
      return (data ?? []) as { id: string; title: string; deadline: string; status: string }[]
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10,
  })

  if (upcoming.length === 0) return null

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
      <h2 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
        <CalendarClock size={15} className="text-amber-600" />
        Prazos próximos
      </h2>
      <div className="space-y-2">
        {upcoming.map((p) => {
          const days = differenceInDays(new Date(p.deadline), new Date())
          const urgent = days <= 3
          return (
            <Link
              key={p.id}
              to={`/dashboard/projeto/${p.id}`}
              className="flex items-center justify-between gap-3 bg-white rounded-xl px-3 py-2.5 hover:border-amber-300 border border-transparent transition-colors"
            >
              <span className="text-sm text-slate-700 font-medium truncate flex-1">{p.title}</span>
              <span className={cn(
                'text-xs font-semibold shrink-0 px-2 py-0.5 rounded-full',
                urgent ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              )}>
                {days === 0 ? 'Hoje' : days === 1 ? 'Amanhã' : `${days} dias`}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ─── Top Viewed Projects Widget ──────────────────────────────

function TopViewedProjectsWidget() {
  const { data: projects = [] } = useQuery({
    queryKey: ['top-viewed-projects'],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, title, view_count, status, city, state, budget_min, budget_max')
        .eq('status', 'open')
        .gt('view_count', 0)
        .order('view_count', { ascending: false })
        .limit(4)
      return (data ?? []) as { id: string; title: string; view_count: number; status: string; city: string | null; state: string | null; budget_min: number | null; budget_max: number | null }[]
    },
    staleTime: 1000 * 60 * 5,
  })

  if (projects.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <TrendingUp size={16} className="text-primary-500" /> Projetos mais vistos
        </h2>
        <Link to="/dashboard/projetos" className="text-xs text-primary-600 hover:underline">Ver todos →</Link>
      </div>
      <div className="space-y-2">
        {projects.map((p) => {
          const budget = p.budget_min || p.budget_max
            ? (p.budget_min && p.budget_max
                ? `R$ ${p.budget_min.toLocaleString('pt-BR')} – ${p.budget_max.toLocaleString('pt-BR')}`
                : p.budget_min
                  ? `A partir de R$ ${p.budget_min.toLocaleString('pt-BR')}`
                  : `Até R$ ${p.budget_max!.toLocaleString('pt-BR')}`)
            : 'A combinar'
          return (
            <Link
              key={p.id}
              to={`/dashboard/projeto/${p.id}`}
              className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-primary-300 hover:shadow-sm transition-all"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{p.title}</p>
                <p className="text-xs text-slate-400 truncate">
                  {budget}{(p.city || p.state) ? ` · ${[p.city, p.state].filter(Boolean).join('/')}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
                <Eye size={12} />
                <span>{p.view_count}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ─── Recommended Suppliers Widget ────────────────────────────

function RecommendedSuppliersWidget() {
  const { data: suppliers = [] } = useQuery({
    queryKey: ['recommended-suppliers-home'],
    queryFn: async () => {
      // Fetch all reviews to compute avg rating per supplier
      const { data: reviews } = await supabase
        .from('supplier_reviews')
        .select('supplier_id, rating')

      const map: Record<string, { sum: number; count: number }> = {}
      for (const r of reviews ?? []) {
        if (!map[r.supplier_id]) map[r.supplier_id] = { sum: 0, count: 0 }
        map[r.supplier_id].sum   += r.rating
        map[r.supplier_id].count += 1
      }

      // Keep only suppliers with ≥2 reviews and avg ≥ 4.0, top 4
      const topIds = Object.entries(map)
        .map(([id, v]) => ({ id, avg: v.sum / v.count, count: v.count }))
        .filter((s) => s.count >= 2 && s.avg >= 4.0)
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 4)
        .map((s) => s.id)

      if (topIds.length === 0) return []

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, company_name, avatar_url, city, state')
        .in('id', topIds)

      return (profiles ?? []).map((p) => ({
        ...p,
        avg:   map[p.id].sum / map[p.id].count,
        count: map[p.id].count,
      }))
    },
    staleTime: 1000 * 60 * 10,
  })

  if (suppliers.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <Star size={16} className="text-amber-500" /> Fornecedores recomendados
        </h2>
        <Link to="/dashboard/fornecedores" className="text-xs text-primary-600 hover:underline">Ver catálogo →</Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {suppliers.map((s) => (
          <Link
            key={s.id}
            to={`/dashboard/fornecedor/${s.id}`}
            className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 hover:border-primary-300 hover:shadow-sm transition-all"
          >
            {s.avatar_url ? (
              <img src={s.avatar_url} alt={s.full_name ?? ''} className="w-10 h-10 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0 text-primary-700 font-bold text-sm">
                {(s.company_name ?? s.full_name ?? 'F')[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 text-sm truncate">{s.company_name ?? s.full_name}</p>
              {(s.city || s.state) && (
                <p className="text-xs text-slate-400 truncate">{[s.city, s.state].filter(Boolean).join(' / ')}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 text-xs">
              <Star size={11} className="fill-amber-400 text-amber-400" />
              <span className="font-semibold text-slate-700">{s.avg.toFixed(1)}</span>
              <span className="text-slate-400">({s.count})</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Empresa Home ────────────────────────────────────────────

function EmpresaHome({ name }: { name: string }) {
  const { user } = useAuthStore()

  const { data: stats } = useQuery({
    queryKey: ['empresa-stats', user?.id],
    queryFn: async () => {
      const { data: projectRows, count: total } = await supabase
        .from('projects').select('id, status', { count: 'exact' }).eq('client_id', user!.id)
      const ids = (projectRows ?? []).map((p) => p.id)
      const [pending, accepted] = ids.length > 0
        ? await Promise.all([
            supabase.from('proposals').select('id', { count: 'exact', head: true }).in('project_id', ids).eq('status', 'pending'),
            supabase.from('proposals').select('id', { count: 'exact', head: true }).in('project_id', ids).eq('status', 'accepted'),
          ])
        : [{ count: 0 }, { count: 0 }]
      return {
        total:    total ?? 0,
        open:     (projectRows ?? []).filter(p => p.status === 'open').length,
        active:   (projectRows ?? []).filter(p => p.status === 'in_progress').length,
        pending:  pending.count ?? 0,
        accepted: accepted.count ?? 0,
      }
    },
    enabled: !!user?.id,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Olá, {name}! 👋</h1>
        <p className="text-slate-500 text-sm mt-1">Gerencie seus projetos e acompanhe as propostas.</p>
      </div>

      <SubscriptionBanner />
      <ProfileCompletenessWidget />
      <UpcomingDeadlinesWidget />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total de projetos"
          value={stats?.total ?? 0}
          icon={<FolderOpen size={22} className="text-primary-600" />}
          color="bg-primary-50"
          to="/dashboard/meus-projetos"
        />
        <StatCard
          label="Projetos abertos"
          value={stats?.open ?? 0}
          icon={<Eye size={22} className="text-blue-600" />}
          color="bg-blue-50"
          to="/dashboard/meus-projetos"
        />
        <StatCard
          label="Em andamento"
          value={stats?.active ?? 0}
          icon={<TrendingUp size={22} className="text-green-600" />}
          color="bg-green-50"
          to="/dashboard/empresa-estatisticas"
        />
        <StatCard
          label="Propostas pendentes"
          value={stats?.pending ?? 0}
          icon={<MessageSquare size={22} className="text-violet-600" />}
          color="bg-violet-50"
          to="/dashboard/propostas-recebidas"
        />
      </div>

      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-3">Ações rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickAction
            to="/dashboard/criar-projeto"
            icon={<PlusCircle size={20} className="text-primary-600" />}
            label="Criar novo projeto"
            description="Publique um projeto e receba propostas"
            color="bg-primary-50"
          />
          <QuickAction
            to="/dashboard/meus-projetos"
            icon={<FolderOpen size={20} className="text-blue-600" />}
            label="Ver meus projetos"
            description="Gerencie todos os seus projetos"
            color="bg-blue-50"
          />
          <QuickAction
            to="/dashboard/propostas-recebidas"
            icon={<Handshake size={20} className="text-green-600" />}
            label="Propostas recebidas"
            description="Revise e aceite propostas dos profissionais"
            color="bg-green-50"
          />
          <QuickAction
            to="/dashboard/fornecedores"
            icon={<Package size={20} className="text-violet-600" />}
            label="Catálogo de fornecedores"
            description="Materiais e insumos"
            color="bg-violet-50"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Bell size={16} className="text-primary-500" /> Atividade recente
          </h2>
          <Link to="/dashboard/notificacoes" className="text-xs text-primary-600 hover:underline">Ver todas →</Link>
        </div>
        <ActivityFeedWidget />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Briefcase size={16} className="text-primary-500" /> Projetos recentes
          </h2>
          <Link to="/dashboard/meus-projetos" className="text-xs text-primary-600 hover:underline">Ver todos →</Link>
        </div>
        <RecentProjectsFeed />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Users size={16} className="text-primary-500" /> Profissionais em destaque
          </h2>
          <Link to="/dashboard/profissionais" className="text-xs text-primary-600 hover:underline">Ver todos →</Link>
        </div>
        <FeaturedProfessionals />
      </div>

      <RecommendedSuppliersWidget />
    </div>
  )
}

// ─── Profissional Home ───────────────────────────────────────

function ProfissionalHome({ name }: { name: string }) {
  const { user } = useAuthStore()

  const { data: stats } = useQuery({
    queryKey: ['prof-stats', user?.id],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const [proposals, active, views] = await Promise.all([
        supabase.from('proposals').select('id', { count: 'exact' }).eq('professional_id', user!.id),
        supabase.from('proposals').select('id', { count: 'exact' }).eq('professional_id', user!.id).eq('status', 'accepted'),
        supabase.from('profile_views').select('id', { count: 'exact' }).eq('profile_id', user!.id).gte('viewed_at', cutoff),
      ])
      return {
        proposals: proposals.count ?? 0,
        accepted:  active.count ?? 0,
        views30d:  views.count ?? 0,
      }
    },
    enabled: !!user?.id,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Olá, {name}! 👋</h1>
        <p className="text-slate-500 text-sm mt-1">Encontre projetos na sua região e envie propostas.</p>
      </div>

      <SubscriptionBanner />
      <ProfileCompletenessWidget />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Propostas enviadas"
          value={stats?.proposals ?? 0}
          icon={<MessageSquare size={22} className="text-primary-600" />}
          color="bg-primary-50"
          to="/dashboard/negociacoes"
        />
        <StatCard
          label="Projetos aceitos"
          value={stats?.accepted ?? 0}
          icon={<CheckCircle2 size={22} className="text-green-600" />}
          color="bg-green-50"
          to="/dashboard/gerenciar-projetos"
        />
        <StatCard
          label="Visualizações (30d)"
          value={stats?.views30d ?? 0}
          icon={<Eye size={22} className="text-blue-600" />}
          color="bg-blue-50"
          to="/dashboard/estatisticas"
        />
      </div>

      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-3">Ações rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickAction
            to="/dashboard/projetos"
            icon={<Search size={20} className="text-primary-600" />}
            label="Buscar projetos"
            description="Veja projetos disponíveis na sua região"
            color="bg-primary-50"
          />
          <QuickAction
            to="/dashboard/negociacoes"
            icon={<Handshake size={20} className="text-blue-600" />}
            label="Minhas negociações"
            description="Acompanhe suas propostas enviadas"
            color="bg-blue-50"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Bell size={16} className="text-primary-500" /> Atividade recente
          </h2>
          <Link to="/dashboard/notificacoes" className="text-xs text-primary-600 hover:underline">Ver todas →</Link>
        </div>
        <ActivityFeedWidget />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Briefcase size={16} className="text-primary-500" /> Projetos abertos
          </h2>
          <Link to="/dashboard/projetos" className="text-xs text-primary-600 hover:underline">Ver todos →</Link>
        </div>
        <RecentProjectsFeed />
      </div>

      <TopViewedProjectsWidget />
    </div>
  )
}

// ─── Fornecedor/Empresa Home ─────────────────────────────────

function FornecedorEmpresaHome({ name }: { name: string }) {
  const { user } = useAuthStore()

  const { data: stats } = useQuery({
    queryKey: ['forn-empresa-stats', user?.id],
    queryFn: async () => {
      const [products, projects] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact' }).eq('supplier_id', user!.id).eq('is_active', true),
        supabase.from('projects').select('id, status', { count: 'exact' }).eq('client_id', user!.id),
      ])
      return {
        products: products.count ?? 0,
        total: projects.count ?? 0,
        open: (projects.data ?? []).filter(p => p.status === 'open').length,
      }
    },
    enabled: !!user?.id,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Olá, {name}! 👋</h1>
        <p className="text-slate-500 text-sm mt-1">Gerencie produtos e projetos em um só lugar.</p>
      </div>
      <SubscriptionBanner />
      <ProfileCompletenessWidget />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Produtos ativos" value={stats?.products ?? 0} icon={<Package size={22} className="text-primary-600" />} color="bg-primary-50" to="/dashboard/produtos" />
        <StatCard label="Projetos publicados" value={stats?.total ?? 0} icon={<FolderOpen size={22} className="text-blue-600" />} color="bg-blue-50" to="/dashboard/meus-projetos" />
        <StatCard label="Projetos abertos" value={stats?.open ?? 0} icon={<Eye size={22} className="text-green-600" />} color="bg-green-50" to="/dashboard/meus-projetos" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-3">Ações rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickAction to="/dashboard/produtos" icon={<Package size={20} className="text-primary-600" />} label="Meus produtos" description="Gerencie seu catálogo de produtos" color="bg-primary-50" />
          <QuickAction to="/dashboard/criar-projeto" icon={<PlusCircle size={20} className="text-blue-600" />} label="Criar projeto" description="Publique um projeto para contratar" color="bg-blue-50" />
          <QuickAction to="/dashboard/meus-projetos" icon={<FolderOpen size={20} className="text-violet-600" />} label="Meus projetos" description="Acompanhe seus projetos publicados" color="bg-violet-50" />
          <QuickAction to="/dashboard/profissionais" icon={<Search size={20} className="text-green-600" />} label="Profissionais" description="Encontre profissionais para contratar" color="bg-green-50" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Bell size={16} className="text-primary-500" /> Atividade recente
          </h2>
          <Link to="/dashboard/notificacoes" className="text-xs text-primary-600 hover:underline">Ver todas →</Link>
        </div>
        <ActivityFeedWidget />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Briefcase size={16} className="text-primary-500" /> Projetos recentes
          </h2>
          <Link to="/dashboard/meus-projetos" className="text-xs text-primary-600 hover:underline">Ver todos →</Link>
        </div>
        <RecentProjectsFeed />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Users size={16} className="text-primary-500" /> Profissionais em destaque
          </h2>
          <Link to="/dashboard/profissionais" className="text-xs text-primary-600 hover:underline">Ver todos →</Link>
        </div>
        <FeaturedProfessionals />
      </div>
    </div>
  )
}

// ─── Empresa Prestadora Home ──────────────────────────────────

function EmpresaPrestadoraHome({ name }: { name: string }) {
  const { user } = useAuthStore()

  const { data: stats } = useQuery({
    queryKey: ['emp-prest-stats', user?.id],
    queryFn: async () => {
      const [myProjects, proposals] = await Promise.all([
        supabase.from('projects').select('id, status', { count: 'exact' }).eq('client_id', user!.id),
        supabase.from('proposals').select('id', { count: 'exact' }).eq('professional_id', user!.id),
      ])
      return {
        total: myProjects.count ?? 0,
        open: (myProjects.data ?? []).filter(p => p.status === 'open').length,
        proposals: proposals.count ?? 0,
      }
    },
    enabled: !!user?.id,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Olá, {name}! 👋</h1>
        <p className="text-slate-500 text-sm mt-1">Publique projetos e também envie propostas.</p>
      </div>
      <SubscriptionBanner />
      <ProfileCompletenessWidget />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Projetos publicados" value={stats?.total ?? 0} icon={<FolderOpen size={22} className="text-primary-600" />} color="bg-primary-50" to="/dashboard/meus-projetos" />
        <StatCard label="Projetos abertos" value={stats?.open ?? 0} icon={<Eye size={22} className="text-blue-600" />} color="bg-blue-50" to="/dashboard/meus-projetos" />
        <StatCard label="Propostas enviadas" value={stats?.proposals ?? 0} icon={<MessageSquare size={22} className="text-violet-600" />} color="bg-violet-50" to="/dashboard/negociacoes" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-3">Ações rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickAction to="/dashboard/criar-projeto" icon={<PlusCircle size={20} className="text-primary-600" />} label="Criar projeto" description="Publique um projeto para contratar" color="bg-primary-50" />
          <QuickAction to="/dashboard/projetos" icon={<Search size={20} className="text-blue-600" />} label="Buscar projetos" description="Encontre projetos para propor serviços" color="bg-blue-50" />
          <QuickAction to="/dashboard/meus-projetos" icon={<FolderOpen size={20} className="text-violet-600" />} label="Meus projetos" description="Acompanhe projetos publicados" color="bg-violet-50" />
          <QuickAction to="/dashboard/negociacoes" icon={<Handshake size={20} className="text-green-600" />} label="Minhas propostas" description="Acompanhe propostas enviadas" color="bg-green-50" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Bell size={16} className="text-primary-500" /> Atividade recente
          </h2>
          <Link to="/dashboard/notificacoes" className="text-xs text-primary-600 hover:underline">Ver todas →</Link>
        </div>
        <ActivityFeedWidget />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Briefcase size={16} className="text-primary-500" /> Projetos abertos
          </h2>
          <Link to="/dashboard/projetos" className="text-xs text-primary-600 hover:underline">Ver todos →</Link>
        </div>
        <RecentProjectsFeed />
      </div>
    </div>
  )
}

// ─── Fornecedor Home ─────────────────────────────────────────

function FornecedorHome({ name }: { name: string }) {
  const { user } = useAuthStore()

  const { data: stats } = useQuery({
    queryKey: ['supplier-stats', user?.id],
    queryFn: async () => {
      const [prodRes, quotesRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('supplier_id', user!.id).eq('is_active', true),
        supabase.from('quote_requests').select('status').eq('supplier_id', user!.id),
      ])
      const quotes = quotesRes.data ?? []
      const total  = quotes.length
      const done   = quotes.filter((q) => q.status !== 'pending').length
      return {
        products:     prodRes.count ?? 0,
        responseRate: total > 0 ? Math.round((done / total) * 100) : undefined,
      }
    },
    enabled: !!user?.id,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Olá, {name}! 👋</h1>
        <p className="text-slate-500 text-sm mt-1">Gerencie seus produtos e aumente sua visibilidade.</p>
      </div>

      <SubscriptionBanner />
      <ProfileCompletenessWidget />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Produtos ativos"
          value={stats?.products ?? 0}
          icon={<Package size={22} className="text-primary-600" />}
          color="bg-primary-50"
          to="/dashboard/produtos"
        />
        <StatCard
          label="Taxa de resposta"
          value={stats?.responseRate !== undefined ? `${stats.responseRate}%` : '—'}
          icon={<TrendingUp size={22} className="text-green-600" />}
          color="bg-green-50"
          to="/dashboard/fornecedor-estatisticas"
        />
      </div>

      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-3">Ações rápidas</h2>
        <QuickAction
          to="/dashboard/produtos"
          icon={<Package size={20} className="text-primary-600" />}
          label="Gerenciar produtos"
          description="Adicione e edite seus produtos no catálogo"
          color="bg-primary-50"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Bell size={16} className="text-primary-500" /> Atividade recente
          </h2>
          <Link to="/dashboard/notificacoes" className="text-xs text-primary-600 hover:underline">Ver todas →</Link>
        </div>
        <ActivityFeedWidget />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Briefcase size={16} className="text-primary-500" /> Projetos abertos
          </h2>
          <Link to="/dashboard/projetos" className="text-xs text-primary-600 hover:underline">Ver projetos →</Link>
        </div>
        <RecentProjectsFeed />
      </div>
    </div>
  )
}

// ─── Recent Projects Feed ─────────────────────────────────────

interface FeedProject {
  id: string
  title: string
  description: string
  city: string | null
  state: string | null
  budget_min: number | null
  budget_max: number | null
  created_at: string
}

function formatBudget(min: number | null, max: number | null) {
  if (!min && !max) return null
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `A partir de ${fmt(min)}`
  return `Até ${fmt(max!)}`
}

function RecentProjectsFeed() {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['recent-projects-feed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, description, city, state, budget_min, budget_max, created_at')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(6)
      if (error) throw error
      return (data ?? []) as FeedProject[]
    },
    staleTime: 60_000,
  })

  if (isLoading) return (
    <div className="flex justify-center py-8">
      <div className="w-6 h-6 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (projects.length === 0) return (
    <p className="text-sm text-slate-400 text-center py-6">Nenhum projeto aberto no momento.</p>
  )

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => {
        const budget = formatBudget(p.budget_min, p.budget_max)
        return (
          <Link
            key={p.id}
            to={`/dashboard/projeto/${p.id}`}
            className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-primary-300 transition-all flex flex-col gap-2"
          >
            <p className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2">{p.title}</p>
            <p className="text-xs text-slate-500 line-clamp-1">{p.description}</p>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400 mt-auto">
              {(p.city || p.state) && (
                <span className="flex items-center gap-1">
                  <MapPin size={10} /> {[p.city, p.state].filter(Boolean).join('/')}
                </span>
              )}
              {budget && <span className="text-primary-600 font-medium">{budget}</span>}
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ─── Featured Professionals Feed ──────────────────────────────

interface FeedProfessional {
  id: string
  full_name: string | null
  profile_image_url: string | null
  avatar_url: string | null
  bio: string | null
  city: string | null
  state: string | null
  user_type: string
  is_verified: boolean
  specialties: string[]
}

function FeaturedProfessionals() {
  const { data: profs = [], isLoading } = useQuery({
    queryKey: ['featured-professionals-feed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, profile_image_url, avatar_url, bio, city, state, user_type, is_verified, specialties')
        .in('user_type', ['profissional', 'empresa_prestadora'])
        .eq('is_active', true)
        .order('is_verified', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6)
      if (error) throw error
      return (data ?? []) as FeedProfessional[]
    },
    staleTime: 60_000,
  })

  if (isLoading) return (
    <div className="flex justify-center py-8">
      <div className="w-6 h-6 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (profs.length === 0) return (
    <p className="text-sm text-slate-400 text-center py-6">Nenhum profissional cadastrado ainda.</p>
  )

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {profs.map((p) => {
        const initials = (p.full_name ?? '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
        const avatar = p.profile_image_url ?? p.avatar_url
        return (
          <Link
            key={p.id}
            to={`/dashboard/profissional/${p.id}`}
            className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-primary-300 transition-all flex items-center gap-3"
          >
            {avatar ? (
              <img src={avatar} alt={p.full_name ?? ''} className="w-10 h-10 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                <span className="text-primary-700 text-xs font-bold">{initials}</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 flex-wrap">
                <p className="font-semibold text-slate-900 text-sm truncate">{p.full_name ?? '—'}</p>
                {p.is_verified && <BadgeCheck size={12} className="text-blue-500 shrink-0" />}
              </div>
              {(p.city || p.state) && (
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin size={9} /> {[p.city, p.state].filter(Boolean).join(', ')}
                </p>
              )}
              {p.specialties?.length > 0 && (
                <p className="text-[10px] text-primary-600 mt-0.5 truncate">{p.specialties.slice(0, 2).join(' · ')}</p>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ─── Activity Feed Widget ─────────────────────────────────────

interface ActivityNotif {
  id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

const NOTIF_ICON: Record<string, React.ReactNode> = {
  nova_proposta:      <MessageSquare size={14} className="text-primary-600" />,
  proposta_aceita:    <CheckCircle2  size={14} className="text-green-600" />,
  proposta_recusada:  <AlertCircle   size={14} className="text-slate-500" />,
  projeto_finalizado: <FolderOpen    size={14} className="text-blue-600" />,
  nova_avaliacao:     <Star          size={14} className="text-amber-500" />,
  cotacao_respondida: <FileCheck     size={14} className="text-cyan-600" />,
}

const NOTIF_BG: Record<string, string> = {
  nova_proposta:      'bg-primary-50',
  proposta_aceita:    'bg-green-50',
  proposta_recusada:  'bg-slate-100',
  projeto_finalizado: 'bg-blue-50',
  nova_avaliacao:     'bg-amber-50',
  cotacao_respondida: 'bg-cyan-50',
}

function ActivityFeedWidget() {
  const { user } = useAuthStore()

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['activity-feed', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id, type, title, body, link, is_read, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5)
      return (data ?? []) as ActivityNotif[]
    },
    enabled: !!user?.id,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  if (isLoading) return null
  if (items.length === 0) return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-400">
      Nenhuma atividade recente.
    </div>
  )

  return (
    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
      {items.map((n) => {
        const inner = (
          <div
            className={cn(
              'flex items-start gap-3 p-4 transition-colors',
              !n.is_read && 'bg-primary-50/40',
              n.link && 'hover:bg-slate-50 cursor-pointer'
            )}
          >
            <div className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
              NOTIF_BG[n.type] ?? 'bg-slate-100'
            )}>
              {NOTIF_ICON[n.type] ?? <Bell size={14} className="text-slate-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm leading-snug', !n.is_read ? 'font-semibold text-slate-900' : 'text-slate-700')}>
                {n.title}
              </p>
              {n.body && (
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{n.body}</p>
              )}
              <p className="text-[10px] text-slate-400 mt-1">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
            {!n.is_read && (
              <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-1.5" />
            )}
          </div>
        )
        return n.link
          ? <Link key={n.id} to={n.link}>{inner}</Link>
          : <div key={n.id}>{inner}</div>
      })}
    </div>
  )
}

// ─── Admin Home ───────────────────────────────────────────────

function AdminHome({ name }: { name: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Painel Administrativo</h1>
        <p className="text-slate-500 text-sm mt-1">Bem-vindo de volta, {name}.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <QuickAction to="/dashboard/admin/usuarios" icon={<FolderOpen size={20} className="text-primary-600" />} label="Usuários" description="Gerenciar todos os usuários" color="bg-primary-50" />
        <QuickAction to="/dashboard/admin/cupons" icon={<Package size={20} className="text-green-600" />} label="Cupons" description="Criar e gerenciar cupons" color="bg-green-50" />
        <QuickAction to="/dashboard/admin/planos" icon={<TrendingUp size={20} className="text-violet-600" />} label="Planos" description="Editar planos de assinatura" color="bg-violet-50" />
        <QuickAction to="/dashboard/admin/pagamentos" icon={<MessageSquare size={20} className="text-blue-600" />} label="Pagamentos" description="Ver logs de pagamento" color="bg-blue-50" />
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────

export function HomePage() {
  const { profile, user, fetchProfile, isLoading } = useAuthStore()
  const [retries, setRetries] = useState(0)

  // Recupera profile se estiver null — faz até 10 tentativas com intervalo de 2s
  useEffect(() => {
    if (!user || profile) return
    if (retries >= 10) return

    const timer = setTimeout(async () => {
      await fetchProfile(user.id)
      setRetries((r) => r + 1)
    }, retries === 0 ? 500 : 2000)

    return () => clearTimeout(timer)
  }, [user, profile, fetchProfile, retries])

  // Ainda carregando
  if (isLoading || (!profile && retries < 10)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Falhou em carregar o perfil
  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-500 text-sm">Não foi possível carregar seu perfil.</p>
        <div className="flex gap-3">
          <button
            onClick={() => { setRetries(0) }}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-700 transition-colors"
          >
            Tentar novamente
          </button>
          <button
            onClick={async () => {
              await useAuthStore.getState().signOut()
              window.location.replace('/')
            }}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm hover:bg-slate-50 transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    )
  }

  const firstName = profile.full_name?.split(' ')[0] ?? 'usuário'

  switch (profile.user_type) {
    case 'empresa':              return <EmpresaHome name={firstName} />
    case 'profissional':         return <ProfissionalHome name={firstName} />
    case 'fornecedor':           return <FornecedorHome name={firstName} />
    case 'fornecedor_empresa':   return <FornecedorEmpresaHome name={firstName} />
    case 'empresa_prestadora':   return <EmpresaPrestadoraHome name={firstName} />
    case 'admin':                return <AdminHome name={firstName} />
    default:
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-slate-500 text-sm">Tipo de conta não reconhecido.</p>
        </div>
      )
  }
}
