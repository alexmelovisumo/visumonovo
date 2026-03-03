import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Users, Briefcase, Package, CreditCard,
  UserCheck, Building2, Wrench, ShieldCheck,
  TrendingUp, Clock, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

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

// ─── Page ─────────────────────────────────────────────────────

export function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [
        { count: totalUsers },
        { count: empresas },
        { count: profissionais },
        { count: fornecedores },
        { count: totalProjects },
        { count: openProjects },
        { count: totalSubs },
        { count: activeSubs },
        { count: pendingSubs },
        { count: trialSubs },
        { count: totalProducts },
        { count: totalCoupons },
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('user_type', 'empresa'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('user_type', 'profissional'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('user_type', 'fornecedor'),
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('user_subscriptions').select('id', { count: 'exact', head: true }),
        supabase.from('user_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('user_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('user_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'trial'),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('coupons').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ])

      return {
        totalUsers: totalUsers ?? 0,
        empresas:   empresas ?? 0,
        profissionais: profissionais ?? 0,
        fornecedores: fornecedores ?? 0,
        totalProjects: totalProjects ?? 0,
        openProjects:  openProjects ?? 0,
        totalSubs:   totalSubs ?? 0,
        activeSubs:  activeSubs ?? 0,
        pendingSubs: pendingSubs ?? 0,
        trialSubs:   trialSubs ?? 0,
        totalProducts: totalProducts ?? 0,
        totalCoupons:  totalCoupons ?? 0,
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
