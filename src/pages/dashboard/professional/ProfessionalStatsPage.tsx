import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Eye, Send, Star, CheckCircle, TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { subDays, format, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

// ─── Helpers ──────────────────────────────────────────────────

function viewsInWindow(views: { viewed_at: string }[], days: number) {
  const cutoff = subDays(new Date(), days)
  return views.filter((v) => new Date(v.viewed_at) >= cutoff).length
}

function buildChartData(views: { viewed_at: string }[], days: number) {
  return Array.from({ length: days }, (_, i) => {
    const day = subDays(new Date(), days - 1 - i)
    return {
      date: format(day, 'dd/MM', { locale: ptBR }),
      views: views.filter((v) => isSameDay(new Date(v.viewed_at), day)).length,
    }
  })
}

// ─── Stat Card ────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  color = 'primary',
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  color?: 'primary' | 'green' | 'amber' | 'blue'
}) {
  const bg: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-600',
    green:   'bg-green-50 text-green-600',
    amber:   'bg-amber-50 text-amber-600',
    blue:    'bg-blue-50 text-blue-600',
  }
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${bg[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Custom Tooltip ───────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="text-slate-500">{label}</p>
      <p className="font-bold text-primary-600">{payload[0].value} visualizações</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function ProfessionalStatsPage() {
  const { user } = useAuthStore()

  const { data: views = [], isLoading: loadingViews } = useQuery({
    queryKey: ['profile-views', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profile_views')
        .select('viewed_at')
        .eq('profile_id', user!.id)
        .order('viewed_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as { viewed_at: string }[]
    },
    enabled: !!user?.id,
  })

  const { data: proposals = [], isLoading: loadingProposals } = useQuery({
    queryKey: ['my-proposals-stats', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposals')
        .select('status')
        .eq('professional_id', user!.id)
      if (error) throw error
      return (data ?? []) as { status: string }[]
    },
    enabled: !!user?.id,
  })

  const { data: reviews = [], isLoading: loadingReviews } = useQuery({
    queryKey: ['my-reviews-stats', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewed_id', user!.id)
      if (error) throw error
      return (data ?? []) as { rating: number }[]
    },
    enabled: !!user?.id,
  })

  const isLoading = loadingViews || loadingProposals || loadingReviews

  // ── Computed ────────────────────────────────────────────────

  const views7d    = viewsInWindow(views, 7)
  const views30d   = viewsInWindow(views, 30)
  const viewsTotal = views.length
  const chartData  = buildChartData(views, 30)

  const proposalsSent     = proposals.length
  const proposalsAccepted = proposals.filter((p) => p.status === 'accepted').length
  const proposalsRejected = proposals.filter((p) => p.status === 'rejected').length
  const conversionRate    = proposalsSent > 0
    ? Math.round((proposalsAccepted / proposalsSent) * 100)
    : 0

  const reviewCount = reviews.length
  const avgRating   = reviewCount > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviewCount
    : 0

  const completedProjects = proposalsAccepted

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/dashboard/home" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Minhas Estatísticas</h1>
          <p className="text-sm text-slate-500">Acompanhe sua performance no marketplace</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Eye size={22} />}
          label="Visualizações (30 dias)"
          value={views30d}
          sub={`${views7d} nos últimos 7 dias · ${viewsTotal} total`}
          color="primary"
        />
        <StatCard
          icon={<Send size={22} />}
          label="Propostas enviadas"
          value={proposalsSent}
          sub={`${proposalsAccepted} aceitas · ${proposalsRejected} recusadas`}
          color="blue"
        />
        <StatCard
          icon={<TrendingUp size={22} />}
          label="Taxa de conversão"
          value={`${conversionRate}%`}
          sub={proposalsSent > 0 ? `${proposalsAccepted} de ${proposalsSent} aceitas` : 'Sem propostas ainda'}
          color="green"
        />
        <StatCard
          icon={<Star size={22} />}
          label="Avaliação média"
          value={reviewCount > 0 ? avgRating.toFixed(1) : '—'}
          sub={reviewCount > 0 ? `${reviewCount} avaliação${reviewCount !== 1 ? 'ões' : ''}` : 'Sem avaliações ainda'}
          color="amber"
        />
      </div>

      {/* Proposals summary */}
      {proposalsSent > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <CheckCircle size={16} className="text-green-500" />
            Projetos aceitos
          </h2>
          <p className="text-3xl font-bold text-slate-900">{completedProjects}</p>
          <p className="text-sm text-slate-400 mt-1">propostas aceitas no total</p>
        </div>
      )}

      {/* Views chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Eye size={16} className="text-primary-500" />
            Visualizações do perfil (30 dias)
          </h2>
          <span className="text-sm text-slate-400">{views30d} no período</span>
        </div>

        {views30d === 0 ? (
          <div className="py-10 text-center">
            <Eye size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">
              Nenhuma visualização nos últimos 30 dias.<br />
              Compartilhe seu perfil para ser encontrado.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9', radius: 4 }} />
              <Bar dataKey="views" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tips */}
      <div className="bg-primary-50 border border-primary-100 rounded-2xl p-5">
        <p className="text-sm font-semibold text-primary-800 mb-2">Dicas para melhorar sua visibilidade</p>
        <ul className="space-y-1.5 text-sm text-primary-700">
          <li>• Complete seu perfil com foto, bio e especialidades</li>
          <li>• Adicione imagens ao portfólio para atrair mais clientes</li>
          <li>• Responda propostas rapidamente para melhorar sua taxa de conversão</li>
          <li>• Peça avaliações aos clientes após concluir projetos</li>
        </ul>
      </div>
    </div>
  )
}
