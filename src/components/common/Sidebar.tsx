import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import {
  LayoutDashboard,
  FolderOpen,
  PlusCircle,
  Search,
  Handshake,
  Package,
  CreditCard,
  MapPin,
  Map,
  User,
  Users,
  Tag,
  BarChart3,
  BarChart2,
  ListChecks,
  Settings,
  MessageSquare,
  Store,
  Heart,
  X,
  ClipboardList,
} from 'lucide-react'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  badge?: number
}

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { profile, user } = useAuthStore()
  const location = useLocation()
  const userType = profile?.user_type

  // Unread messages count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-count', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', user!.id)
      return count ?? 0
    },
    enabled: !!user?.id,
    refetchInterval: 30_000,
  })

  const commonItems: NavItem[] = [
    { label: 'Início', path: '/dashboard/home', icon: <LayoutDashboard size={18} /> },
    { label: 'Mensagens', path: '/dashboard/mensagens', icon: <MessageSquare size={18} />, badge: unreadCount || undefined },
    { label: 'Favoritos', path: '/dashboard/favoritos', icon: <Heart size={18} /> },
    { label: 'Meu Perfil', path: '/dashboard/perfil', icon: <User size={18} /> },
    { label: 'Localização', path: '/dashboard/localizacao', icon: <MapPin size={18} /> },
    { label: 'Assinatura', path: '/dashboard/renovar-assinatura', icon: <CreditCard size={18} /> },
  ]

  const companyItems: NavItem[] = [
    { label: 'Meus Projetos', path: '/dashboard/meus-projetos', icon: <FolderOpen size={18} /> },
    { label: 'Criar Projeto', path: '/dashboard/criar-projeto', icon: <PlusCircle size={18} /> },
    { label: 'Profissionais', path: '/dashboard/profissionais', icon: <Users size={18} /> },
    { label: 'Mapa de Profissionais', path: '/dashboard/profissionais/mapa', icon: <Map size={18} /> },
    { label: 'Fornecedores', path: '/dashboard/fornecedores', icon: <Store size={18} /> },
    { label: 'Cotações', path: '/dashboard/cotacoes', icon: <ClipboardList size={18} /> },
  ]

  const professionalItems: NavItem[] = [
    { label: 'Projetos Disponíveis', path: '/dashboard/projetos', icon: <Search size={18} /> },
    { label: 'Negociações', path: '/dashboard/negociacoes', icon: <Handshake size={18} /> },
    { label: 'Meus Projetos', path: '/dashboard/gerenciar-projetos', icon: <ListChecks size={18} /> },
    { label: 'Estatísticas', path: '/dashboard/estatisticas', icon: <BarChart2 size={18} /> },
    { label: 'Cotações', path: '/dashboard/cotacoes', icon: <ClipboardList size={18} /> },
  ]

  const supplierItems: NavItem[] = [
    { label: 'Meus Produtos', path: '/dashboard/produtos', icon: <Package size={18} /> },
    { label: 'Cotações', path: '/dashboard/cotacoes', icon: <ClipboardList size={18} /> },
  ]

  const adminItems: NavItem[] = [
    { label: 'Painel Admin', path: '/dashboard/admin', icon: <BarChart3 size={18} /> },
    { label: 'Usuários', path: '/dashboard/admin/usuarios', icon: <Users size={18} /> },
    { label: 'Cupons', path: '/dashboard/admin/cupons', icon: <Tag size={18} /> },
    { label: 'Planos', path: '/dashboard/admin/planos', icon: <CreditCard size={18} /> },
    { label: 'Categorias', path: '/dashboard/admin/categorias', icon: <Settings size={18} /> },
    { label: 'Pagamentos', path: '/dashboard/admin/pagamentos', icon: <BarChart3 size={18} /> },
  ]

  const getTypeItems = (): NavItem[] => {
    switch (userType) {
      case 'empresa':
        return companyItems
      case 'profissional':
        return professionalItems
      case 'fornecedor':
        return supplierItems
      case 'fornecedor_empresa':
        return [
          ...supplierItems,
          { label: 'Meus Projetos', path: '/dashboard/meus-projetos', icon: <FolderOpen size={18} /> },
          { label: 'Criar Projeto', path: '/dashboard/criar-projeto', icon: <PlusCircle size={18} /> },
          { label: 'Profissionais', path: '/dashboard/profissionais', icon: <Users size={18} /> },
          { label: 'Mapa de Profissionais', path: '/dashboard/profissionais/mapa', icon: <Map size={18} /> },
        ]
      case 'empresa_prestadora':
        return [
          ...professionalItems,
          { label: 'Meus Projetos', path: '/dashboard/meus-projetos', icon: <FolderOpen size={18} /> },
          { label: 'Criar Projeto', path: '/dashboard/criar-projeto', icon: <PlusCircle size={18} /> },
          { label: 'Fornecedores', path: '/dashboard/fornecedores', icon: <Store size={18} /> },
        ]
      case 'admin':
        return [...companyItems, ...professionalItems, ...supplierItems, ...adminItems]
      default:
        return []
    }
  }

  const isActive = (path: string) => location.pathname === path

  const NavLink = ({ item }: { item: NavItem }) => (
    <Link
      to={item.path}
      onClick={onClose}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
        isActive(item.path)
          ? 'bg-primary-600 text-white shadow-sm'
          : 'text-primary-200 hover:bg-primary-800/50 hover:text-white'
      }`}
    >
      {item.icon}
      <span className="flex-1">{item.label}</span>
      {item.badge ? (
        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      ) : null}
    </Link>
  )

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-primary-950 transition-transform duration-300
        lg:relative lg:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-4 safe-top">
        <Link to="/dashboard/home" className="flex items-center gap-2" onClick={onClose}>
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <span className="text-white font-bold text-lg">Visumo</span>
        </Link>
        <button
          onClick={onClose}
          className="lg:hidden text-primary-300 hover:text-white transition-colors"
          aria-label="Fechar menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {/* Common */}
        {commonItems.map((item) => <NavLink key={item.path} item={item} />)}

        {/* Divider */}
        {getTypeItems().length > 0 && (
          <>
            <div className="my-2 border-t border-primary-800" />
            <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-500">
              {userType === 'empresa' && 'Projetos'}
              {userType === 'profissional' && 'Trabalhos'}
              {userType === 'fornecedor' && 'Produtos'}
              {userType === 'fornecedor_empresa' && 'Negócios'}
              {userType === 'empresa_prestadora' && 'Trabalhos'}
              {userType === 'admin' && 'Gestão'}
            </p>
            {getTypeItems().map((item) => <NavLink key={item.path} item={item} />)}
          </>
        )}
      </nav>

      {/* Footer: user info */}
      {profile && (
        <div className="border-t border-primary-800 p-4 safe-bottom">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-xs font-semibold text-white">
              {(profile.full_name ?? profile.email ?? 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {profile.full_name ?? 'Usuário'}
              </p>
              <p className="text-xs text-primary-400 truncate">{profile.email}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
