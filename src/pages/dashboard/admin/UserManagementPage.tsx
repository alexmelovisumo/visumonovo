import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, UserCheck, UserX, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { USER_TYPE_LABELS, SUBSCRIPTION_STATUS_LABELS } from '@/utils/constants'
import type { Profile, UserType, UserSubscription } from '@/types'

type ProfileWithSub = Profile & { subscription?: Pick<UserSubscription, 'status' | 'plan'> & { plan?: { display_name: string } } }

const USER_TYPES: UserType[] = ['empresa', 'profissional', 'fornecedor', 'admin']

const TYPE_COLORS: Record<UserType, string> = {
  empresa:      'bg-violet-100 text-violet-700',
  profissional: 'bg-amber-100 text-amber-700',
  fornecedor:   'bg-green-100 text-green-700',
  admin:        'bg-rose-100 text-rose-700',
}

const SUB_STATUS_COLORS: Record<string, string> = {
  trial:     'bg-amber-100 text-amber-700',
  active:    'bg-green-100 text-green-700',
  pending:   'bg-rose-100 text-rose-700',
  cancelled: 'bg-slate-100 text-slate-600',
  expired:   'bg-slate-100 text-slate-600',
}

// ─── Row Actions Menu ─────────────────────────────────────────

function RowActions({
  user,
  onToggleActive,
  onChangeType,
  loading,
}: {
  user: ProfileWithSub
  onToggleActive: () => void
  onChangeType: (type: UserType) => void
  loading: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen((v) => !v)}
        isLoading={loading}
        className="gap-1"
      >
        Ações <ChevronDown size={13} />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl border border-slate-200 shadow-lg min-w-[180px] py-1">
            <button
              className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
              onClick={() => { onToggleActive(); setOpen(false) }}
            >
              {user.is_active
                ? <><UserX size={14} className="text-rose-500" /> Desativar conta</>
                : <><UserCheck size={14} className="text-green-600" /> Ativar conta</>
              }
            </button>
            <div className="border-t border-slate-100 my-1" />
            <p className="px-4 py-1 text-xs text-slate-400 font-medium">Alterar tipo</p>
            {USER_TYPES.filter((t) => t !== user.user_type).map((type) => (
              <button
                key={type}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
                onClick={() => { onChangeType(type); setOpen(false) }}
              >
                <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[type]}`}>
                  {USER_TYPE_LABELS[type]}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function UserManagementPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<UserType | 'all'>('all')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          subscription:user_subscriptions(status, plan:subscription_plans(display_name))
        `)
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return (data as unknown as ProfileWithSub[]).map((u) => ({
        ...u,
        subscription: Array.isArray(u.subscription) ? u.subscription[0] : u.subscription,
      }))
    },
  })

  const updateUser = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Profile> }) => {
      const { error } = await supabase.from('profiles').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Usuário atualizado.')
    },
    onError: () => toast.error('Erro ao atualizar usuário.'),
    onSettled: () => setLoadingId(null),
  })

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || u.user_type === typeFilter
    return matchSearch && matchType
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Gerenciar usuários</h1>
        <p className="text-slate-500 text-sm mt-1">{users.length} usuários cadastrados</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(['all', ...USER_TYPES] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                typeFilter === t
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-primary-300'
              }`}
            >
              {t === 'all' ? 'Todos' : USER_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-slate-400 py-16">Nenhum usuário encontrado.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Usuário</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs hidden sm:table-cell">Assinatura</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs hidden md:table-cell">Cadastro</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500 text-xs">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => (
                  <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${!u.is_active ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold shrink-0">
                          {(u.full_name ?? u.email)[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">{u.full_name ?? '—'}</p>
                          <p className="text-xs text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${TYPE_COLORS[u.user_type]}`}>
                        {USER_TYPE_LABELS[u.user_type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {u.subscription ? (
                        <div>
                          <p className="text-xs text-slate-600">{(u.subscription as { plan?: { display_name?: string } })?.plan?.display_name ?? '—'}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${SUB_STATUS_COLORS[u.subscription.status] ?? 'bg-slate-100 text-slate-600'}`}>
                            {SUBSCRIPTION_STATUS_LABELS[u.subscription.status as keyof typeof SUBSCRIPTION_STATUS_LABELS] ?? u.subscription.status}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Sem assinatura</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">
                      {format(new Date(u.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {u.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RowActions
                        user={u}
                        loading={loadingId === u.id && updateUser.isPending}
                        onToggleActive={() => {
                          setLoadingId(u.id)
                          updateUser.mutate({ id: u.id, patch: { is_active: !u.is_active } })
                        }}
                        onChangeType={(type) => {
                          setLoadingId(u.id)
                          updateUser.mutate({ id: u.id, patch: { user_type: type } })
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
