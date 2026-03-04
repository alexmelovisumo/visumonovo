import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { KeyRound, LogOut, Trash2, ShieldAlert, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { USER_TYPE_LABELS } from '@/utils/constants'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ─── Section Card ─────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
        <span className="text-primary-600">{icon}</span>
        <h2 className="font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

// ─── Change Password ───────────────────────────────────────────

function ChangePasswordForm() {
  const [newPw, setNewPw]     = useState('')
  const [confirmPw, setConfirm] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPw.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres.'); return }
    if (newPw !== confirmPw) { toast.error('As senhas não coincidem.'); return }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw })
      if (error) throw error
      toast.success('Senha alterada com sucesso!')
      setNewPw('')
      setConfirm('')
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Erro ao alterar senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      <div>
        <label className="text-xs font-medium text-slate-600 mb-1.5 block">Nova senha</label>
        <div className="relative">
          <input
            type={showNew ? 'text' : 'password'}
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className="w-full h-10 rounded-xl border border-slate-200 px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="button"
            onClick={() => setShowNew((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600 mb-1.5 block">Confirmar nova senha</label>
        <input
          type="password"
          value={confirmPw}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repita a nova senha"
          className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <button
        type="submit"
        disabled={loading || !newPw || !confirmPw}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
      >
        {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <KeyRound size={15} />}
        {loading ? 'Salvando...' : 'Alterar senha'}
      </button>
    </form>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function AccountSettingsPage() {
  const { user, profile, signOut } = useAuthStore()
  const navigate = useNavigate()
  const [deactivating, setDeactivating] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  async function handleDeactivate() {
    if (!confirmDeactivate) { setConfirmDeactivate(true); return }
    setDeactivating(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', user!.id)
      if (error) throw error
      toast.success('Conta desativada. Você será desconectado.')
      await signOut()
      navigate('/')
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Erro ao desativar conta.')
      setDeactivating(false)
      setConfirmDeactivate(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações da conta</h1>
        <p className="text-slate-500 text-sm mt-1">Gerencie sua segurança e preferências</p>
      </div>

      {/* Account info */}
      <Section title="Informações da conta" icon={<ShieldAlert size={18} />}>
        <dl className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-slate-50">
            <dt className="text-sm text-slate-500">E-mail</dt>
            <dd className="text-sm font-medium text-slate-800">{user?.email}</dd>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-50">
            <dt className="text-sm text-slate-500">Tipo de conta</dt>
            <dd className="text-sm font-medium text-slate-800">
              {profile?.user_type
                ? USER_TYPE_LABELS[profile.user_type as keyof typeof USER_TYPE_LABELS] ?? profile.user_type
                : '—'}
            </dd>
          </div>
          <div className="flex items-center justify-between py-2">
            <dt className="text-sm text-slate-500">Membro desde</dt>
            <dd className="text-sm font-medium text-slate-800">
              {profile?.created_at
                ? format(new Date(profile.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                : '—'}
            </dd>
          </div>
        </dl>
      </Section>

      {/* Change password */}
      <Section title="Alterar senha" icon={<KeyRound size={18} />}>
        <ChangePasswordForm />
      </Section>

      {/* Session */}
      <Section title="Sessão" icon={<LogOut size={18} />}>
        <p className="text-sm text-slate-500 mb-4">Encerre sua sessão atual em todos os dispositivos.</p>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
        >
          <LogOut size={15} />
          Sair da conta
        </button>
      </Section>

      {/* Danger zone */}
      <div className="bg-white rounded-2xl border border-rose-200 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-rose-100 bg-rose-50">
          <Trash2 size={18} className="text-rose-600" />
          <h2 className="font-semibold text-rose-800">Zona de perigo</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-4">
            Desativar sua conta oculta seu perfil e impede novos acessos.
            Entre em contato com o suporte para reativação.
          </p>
          {confirmDeactivate && (
            <p className="text-sm font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 mb-4">
              Tem certeza? Esta ação desconectará você imediatamente.
            </p>
          )}
          <button
            onClick={handleDeactivate}
            disabled={deactivating}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
              confirmDeactivate
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'border border-rose-300 text-rose-700 hover:bg-rose-50'
            }`}
          >
            {deactivating
              ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <Trash2 size={15} />
            }
            {confirmDeactivate ? 'Confirmar desativação' : 'Desativar minha conta'}
          </button>
          {confirmDeactivate && (
            <button
              onClick={() => setConfirmDeactivate(false)}
              className="ml-3 text-sm text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
