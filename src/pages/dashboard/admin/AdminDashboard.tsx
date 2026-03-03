import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
  AreaChart, Area,
} from 'recharts'
import {
  Users, Briefcase, Package, CreditCard,
  UserCheck, Building2, Wrench, ShieldCheck,
  TrendingUp, Clock, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─── Helpers ──────────────────────────────────────────────────

function getMonthLabels(n = 6): string[] {
  return Array.from({ length: n }, (_, i) =>
    format(subMonths(new Date(), n - 1 - i), 'MMM/yy', { locale: ptBR })
  )
}

function countByMonth(dates: string[], labels: string[]): Record<string, number> {
  const counts: Record<string, number> = {}
  labels.forEach((l) => (counts[l] = 0))
  dates.forEach((d) => {
    const label = format(new Date(d), 'MMM/yy', { locale: ptBR })
    if (label in counts) counts[label]++
  })
  return counts
}

// ─── Stat Card ────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color = 'primary',
  sub,
}: {
  label: string
  value: number | string
  icon: React.ReactNode
  color?: 'primary' | 'green' | 'amber' | 'rose' | 'violet'
  sub?: string
}) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    green:   'bg-green-50 text-green-600',
    amber:   'bg-amber-50 text-amber-600',
    rose:    'bg-rose-50 text-rose-600',
    violet:  'bg-violet-50 text-violet-600',
  }
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Quick Link Card ──────────────────────────────────────────

function QuickLink({ to, label, desc, icon }: { to: string; label: string; desc: string; icon: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-primary-300 hover:shadow-md transition-all flex items-center gap-4 group"
    >
      <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 group-hover:bg-primary-100 transition-colors">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-slate-900 text-sm">{label}</p>
        <p className="text-xs text-slate-400">{desc}</p>
      </div>
    </Link>
  )
}

// ─── Chart wrapper ────────────────────────────────────────────

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <p className="text-sm font-semibold text-slate-700 mb-4">{title}</p>
      {children}
    </div>
  )
}

// ─── Custom Tooltip ───────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

const MONTHS = getMonthLabels(6)
const SIXMONTHS_AGO = subMonths(new Date(), 6).toISOString()

const PIE_COLORS: Record<string, string> = {
  empresa:            '#4f46e5',
  profissional:       '#f59e0b',
  fornecedor:         '#10b981',
  fornecedor_empresa: '#8b5cf6',
  empresa_prestadora: '#3b82f6',
  admin:              '#ef4444',
}

const TYPE_LABELS: Record<string, string> = {
  empresa:            'Empresa',
  profissional:       'Profissional',
  fornecedor:         'Fornecedor',
  fornecedor_empresa: 'Forn. Empresa',
  empresa_prestadora: 'Emp. Prestadora',
  admin:              'Admin',
}

export function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [
        { count: totalUsers },
        { count: empresas },
        { count: profissionais },
        { count: fornecedores },
        { count: fornecedorEmpresa },
        { count: empresaPrestadora },
        { count: totalProjects },
        { count: openProjects },
        { count: totalSubs },
        { count: activeSubs },
        { count: pendingSubs },
        { count: trialSubs },
        { count: totalProducts },
        { count: totalCoupons },
        { data: recentUserDates },
        { data: recentProjectDates },
        { data: recentSubDates },
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('user_type', 'empresa'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('user_type', 'profissional'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('user_type', 'fornecedor'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('user_type', 'fornecedor_empresa'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('user_type', 'empresa_prestadora'),
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('user_subscriptions').select('id', { count: 'exact', head: true }),
        supabase.from('user_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('user_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('user_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'trial'),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('coupons').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('profiles').select('created_at').gte('created_at', SIXMONTHS_AGO),
        supabase.from('projects').select('created_at').gte('created_at', SIXMONTHS_AGO),
        supabase.from('user_subscriptions').select('created_at').gte('created_at', SIXMONTHS_AGO).in('status', ['active', 'trial']),
      ])

      // Monthly growth charts
      const usersByMonth   = countByMonth((recentUserDates ?? []).map((r) => r.created_at), MONTHS)
      const projectsByMonth = countByMonth((recentProjectDates ?? []).map((r) => r.created_at), MONTHS)
      const subsByMonth    = countByMonth((recentSubDates ?? []).map((r) => r.created_at), MONTHS)

      const growthData = MONTHS.map((m) => ({
        month: m,
        Usuários:  usersByMonth[m] ?? 0,
        Projetos:  projectsByMonth[m] ?? 0,
      }))

      const subsGrowthData = MONTHS.map((m) => ({
        month: m,
        Assinaturas: subsByMonth[m] ?? 0,
      }))

      // User type pie
      const userTypePie = [
        { name: TYPE_LABELS.empresa,            value: empresas ?? 0,            key: 'empresa' },
        { name: TYPE_LABELS.profissional,        value: profissionais ?? 0,       key: 'profissional' },
        { name: TYPE_LABELS.fornecedor,          value: fornecedores ?? 0,        key: 'fornecedor' },
        { name: TYPE_LABELS.fornecedor_empresa,  value: fornecedorEmpresa ?? 0,   key: 'fornecedor_empresa' },
        { name: TYPE_LABELS.empresa_prestadora,  value: empresaPrestadora ?? 0,   key: 'empresa_prestadora' },
      ].filter((d) => d.value > 0)

      // Subscription status pie
      const subStatusPie = [
        { name: 'Ativas',   value: activeSubs ?? 0,  color: '#10b981' },
        { name: 'Trial',    value: trialSubs ?? 0,   color: '#f59e0b' },
        { name: 'Pendente', value: pendingSubs ?? 0, color: '#ef4444' },
      ].filter((d) => d.value > 0)

      return {
        totalUsers: totalUsers ?? 0,
        empresas: empresas ?? 0,
        profissionais: profissionais ?? 0,
        fornecedores: fornecedores ?? 0,
        totalProjects: totalProjects ?? 0,
        openProjects: openProjects ?? 0,
        totalSubs: totalSubs ?? 0,
        activeSubs: activeSubs ?? 0,
        pendingSubs: pendingSubs ?? 0,
        trialSubs: trialSubs ?? 0,
        totalProducts: totalProducts ?? 0,
        totalCoupons: totalCoupons ?? 0,
        growthData,
        subsGrowthData,
        userTypePie,
        subStatusPie,
      }
    },
    refetchInterval: 60_000,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const s = stats!

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Painel Administrativo</h1>
        <p className="text-slate-500 text-sm mt-1">Visão geral da plataforma</p>
      </div>

      {/* Users */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Usuários</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total de usuários" value={s.totalUsers} icon={<Users size={22} />} />
          <StatCard label="Empresas" value={s.empresas} icon={<Building2 size={22} />} color="violet" />
          <StatCard label="Profissionais" value={s.profissionais} icon={<Wrench size={22} />} color="amber" />
          <StatCard label="Fornecedores" value={s.fornecedores} icon={<Package size={22} />} color="green" />
        </div>
      </section>

      {/* Projects */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Projetos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total de projetos" value={s.totalProjects} icon={<Briefcase size={22} />} />
          <StatCard label="Projetos abertos" value={s.openProjects} icon={<TrendingUp size={22} />} color="green" />
          <StatCard label="Produtos de fornecedores" value={s.totalProducts} icon={<Package size={22} />} color="violet" />
          <StatCard label="Cupons ativos" value={s.totalCoupons} icon={<ShieldCheck size={22} />} color="amber" />
        </div>
      </section>

      {/* Subscriptions */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Assinaturas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total" value={s.totalSubs} icon={<CreditCard size={22} />} />
          <StatCard label="Ativas" value={s.activeSubs} icon={<CheckCircle2 size={22} />} color="green"
            sub={`${s.totalSubs > 0 ? Math.round((s.activeSubs / s.totalSubs) * 100) : 0}% do total`} />
          <StatCard label="Trial" value={s.trialSubs} icon={<UserCheck size={22} />} color="amber" />
          <StatCard label="Aguardando pagamento" value={s.pendingSubs} icon={<Clock size={22} />} color="rose"
            sub={s.pendingSubs > 0 ? 'Requer atenção' : 'Tudo certo'} />
        </div>
      </section>

      {/* Charts */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Análise de Crescimento</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Growth bar chart */}
          <ChartCard title="Novos cadastros e projetos (últimos 6 meses)">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={s.growthData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Usuários" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Projetos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Subscriptions area chart */}
          <ChartCard title="Novas assinaturas (últimos 6 meses)">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={s.subsGrowthData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Assinaturas"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fill="url(#subGrad)"
                  dot={{ r: 4, fill: '#4f46e5' }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* User type pie */}
          <ChartCard title="Distribuição por tipo de usuário">
            {s.userTypePie.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-10">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={s.userTypePie}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                  >
                    {s.userTypePie.map((entry) => (
                      <Cell key={entry.key} fill={PIE_COLORS[entry.key] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} usuários`]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Subscription status pie */}
          <ChartCard title="Status das assinaturas">
            {s.subStatusPie.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-10">Sem dados</p>
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="60%" height={220}>
                  <PieChart>
                    <Pie
                      data={s.subStatusPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {s.subStatusPie.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} assinaturas`]} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="flex-1 space-y-3">
                  {s.subStatusPie.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: entry.color }} />
                        <span className="text-sm text-slate-600">{entry.name}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">{entry.value}</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Total</span>
                    <span className="text-sm font-bold text-slate-800">{s.totalSubs}</span>
                  </div>
                </div>
              </div>
            )}
          </ChartCard>

        </div>
      </section>

      {/* Quick links */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Acesso rápido</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickLink to="/dashboard/admin/usuarios" label="Gerenciar usuários" desc="Visualizar, editar e moderar contas" icon={<Users size={18} />} />
          <QuickLink to="/dashboard/admin/cupons" label="Cupons de desconto" desc="Criar e gerenciar cupons" icon={<ShieldCheck size={18} />} />
          <QuickLink to="/dashboard/admin/planos" label="Planos de assinatura" desc="Editar preços e links de pagamento" icon={<CreditCard size={18} />} />
          <QuickLink to="/dashboard/admin/categorias" label="Categorias" desc="Categorias de projetos" icon={<AlertCircle size={18} />} />
          <QuickLink to="/dashboard/admin/pagamentos" label="Logs de pagamentos" desc="Histórico de assinaturas" icon={<TrendingUp size={18} />} />
        </div>
      </section>
    </div>
  )
}
