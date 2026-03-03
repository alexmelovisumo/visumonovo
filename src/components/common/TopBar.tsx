import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Menu, Bell, ChevronDown, LogOut, User, Settings,
  CheckCheck, Megaphone, Star, FileCheck, XCircle,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import type { Notification } from '@/types'

// ─── Notification icon by type ────────────────────────────────

function NotifIcon({ type }: { type: Notification['type'] }) {
  const cls = 'shrink-0 rounded-full p-1.5'
  switch (type) {
    case 'nova_proposta':
      return <div className={cn(cls, 'bg-primary-100 text-primary-600')}><Megaphone size={14} /></div>
    case 'proposta_aceita':
      return <div className={cn(cls, 'bg-green-100 text-green-600')}><FileCheck size={14} /></div>
    case 'proposta_recusada':
      return <div className={cn(cls, 'bg-red-100 text-red-500')}><XCircle size={14} /></div>
    case 'projeto_finalizado':
      return <div className={cn(cls, 'bg-blue-100 text-blue-600')}><CheckCheck size={14} /></div>
    case 'nova_avaliacao':
      return <div className={cn(cls, 'bg-amber-100 text-amber-500')}><Star size={14} /></div>
    default:
      return <div className={cn(cls, 'bg-slate-100 text-slate-500')}><Bell size={14} /></div>
  }
}

// ─── Notifications Dropdown ───────────────────────────────────

function NotificationsDropdown({ onClose }: { onClose: () => void }) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data as Notification[]
    },
    enabled: !!user?.id,
  })

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user!.id)
        .eq('is_read', false)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] }),
  })

  const markOneRead = async (notif: Notification) => {
    if (!notif.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id)
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
    }
    if (notif.link) {
      navigate(notif.link)
      onClose()
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <p className="font-semibold text-slate-800 text-sm">
          Notificações {unreadCount > 0 && (
            <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </p>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
          >
            <CheckCheck size={12} /> Marcar todas lidas
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
        {notifications.length === 0 ? (
          <div className="py-10 text-center">
            <Bell size={28} className="text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Nenhuma notificação ainda</p>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => markOneRead(n)}
              className={cn(
                'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50',
                !n.is_read && 'bg-primary-50/50 hover:bg-primary-50'
              )}
            >
              <NotifIcon type={n.type} />
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm leading-snug', !n.is_read ? 'font-semibold text-slate-900' : 'text-slate-700')}>
                  {n.title}
                </p>
                {n.body && (
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
                )}
                <p className="text-[10px] text-slate-400 mt-1">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
              {!n.is_read && (
                <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-1.5" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

// ─── TopBar ───────────────────────────────────────────────────

interface TopBarProps {
  onMenuClick: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { profile, user, signOut } = useAuthStore()
  const queryClient = useQueryClient()
  const [menuOpen, setMenuOpen]   = useState(false)
  const [bellOpen, setBellOpen]   = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLDivElement>(null)

  // Unread notifications count (poll 30s)
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notif-count', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('is_read', false)
      return count ?? 0
    },
    enabled: !!user?.id,
    refetchInterval: 30_000,
  })

  // Realtime: invalidate count when new notification arrives
  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`notif:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notif-count', user.id] })
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id, queryClient])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const displayName = profile?.full_name ?? profile?.email ?? 'Usuário'
  const initials = displayName.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6 safe-top">
      {/* Left: hamburger (mobile) */}
      <button
        onClick={onMenuClick}
        className="flex lg:hidden items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      {/* Logo (mobile center) */}
      <Link to="/dashboard/home" className="lg:hidden">
        <span className="text-lg font-bold text-primary-600">Visumo</span>
      </Link>

      {/* Right: notifications + user menu */}
      <div className="flex items-center gap-2 ml-auto">

        {/* Bell */}
        <div ref={bellRef} className="relative">
          <button
            onClick={() => { setBellOpen(!bellOpen); setMenuOpen(false) }}
            className="relative flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Notificações"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          {bellOpen && (
            <NotificationsDropdown onClose={() => setBellOpen(false)} />
          )}
        </div>

        {/* User menu */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => { setMenuOpen(!menuOpen); setBellOpen(false) }}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition-colors"
          >
            {profile?.profile_image_url ? (
              <img
                src={profile.profile_image_url}
                alt={displayName}
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold">
                {initials}
              </div>
            )}
            <span className="hidden md:block text-sm font-medium text-slate-700 max-w-[120px] truncate">
              {displayName}
            </span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-1 w-48 rounded-xl border border-slate-200 bg-white shadow-lg py-1 z-50">
              <Link
                to="/dashboard/perfil"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <User size={16} /> Meu Perfil
              </Link>
              <Link
                to="/dashboard/localizacao"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Settings size={16} /> Configurações
              </Link>
              <div className="my-1 border-t border-slate-100" />
              <button
                onClick={() => { setMenuOpen(false); signOut() }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
