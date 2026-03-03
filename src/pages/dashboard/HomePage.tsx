import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  PlusCircle, Search, FolderOpen, Handshake,
  Package, AlertCircle, CheckCircle2, Clock,
  TrendingUp, Eye, MessageSquare, ArrowRight,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useSubscription, getDaysUntilExpiry } from '@/hooks/useSubscription'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

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

// ─── Empresa Home ────────────────────────────────────────────

function EmpresaHome({ name }: { name: string }) {
  const { user } = useAuthStore()

  const { data: stats } = useQuery({
    queryKey: ['empresa-stats', user?.id],
    queryFn: async () => {
      const [projects, proposals] = await Promise.all([
        supabase.from('projects').select('id, status', { count: 'exact' }).eq('client_id', user!.id),
        supabase.from('proposals').select('id', { count: 'exact' }).in(
          'project_id',
          (await supabase.from('projects').select('id').eq('client_id', user!.id)).data?.map(p => p.id) ?? []
        ),
      ])
      return {
        total:    projects.count ?? 0,
        open:     (projects.data ?? []).filter(p => p.status === 'open').length,
        active:   (projects.data ?? []).filter(p => p.status === 'in_progress').length,
        proposals: proposals.count ?? 0,
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
        />
        <StatCard
          label="Propostas recebidas"
          value={stats?.proposals ?? 0}
          icon={<MessageSquare size={22} className="text-violet-600" />}
          color="bg-violet-50"
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
            to="/dashboard/profissionais"
            icon={<Search size={20} className="text-green-600" />}
            label="Encontrar profissionais"
            description="Veja perfis de profissionais"
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
    </div>
  )
}

// ─── Profissional Home ───────────────────────────────────────

function ProfissionalHome({ name }: { name: string }) {
  const { user } = useAuthStore()

  const { data: stats } = useQuery({
    queryKey: ['prof-stats', user?.id],
    queryFn: async () => {
      const [proposals, active] = await Promise.all([
        supabase.from('proposals').select('id', { count: 'exact' }).eq('professional_id', user!.id),
        supabase.from('proposals').select('id', { count: 'exact' }).eq('professional_id', user!.id).eq('status', 'accepted'),
      ])
      return {
        proposals: proposals.count ?? 0,
        accepted:  active.count ?? 0,
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

      <div className="grid grid-cols-2 gap-4">
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
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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
    </div>
  )
}

// ─── Fornecedor Home ─────────────────────────────────────────

function FornecedorHome({ name }: { name: string }) {
  const { user } = useAuthStore()

  const { data: stats } = useQuery({
    queryKey: ['supplier-stats', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('products')
        .select('id', { count: 'exact' })
        .eq('supplier_id', user!.id)
        .eq('is_active', true)
      return { products: count ?? 0 }
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

      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Produtos ativos"
          value={stats?.products ?? 0}
          icon={<Package size={22} className="text-primary-600" />}
          color="bg-primary-50"
          to="/dashboard/produtos"
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
  const { profile, user, fetchProfile } = useAuthStore()

  // Recupera profile se estiver null (pode acontecer após redirect pós-signup)
  useEffect(() => {
    if (user && !profile) {
      fetchProfile(user.id)
    }
  }, [user, profile, fetchProfile])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'usuário'

  switch (profile?.user_type) {
    case 'empresa':              return <EmpresaHome name={firstName} />
    case 'profissional':         return <ProfissionalHome name={firstName} />
    case 'fornecedor':           return <FornecedorHome name={firstName} />
    case 'fornecedor_empresa':   return <FornecedorEmpresaHome name={firstName} />
    case 'empresa_prestadora':   return <EmpresaPrestadoraHome name={firstName} />
    case 'admin':                return <AdminHome name={firstName} />
    default:
      return (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )
  }
}
