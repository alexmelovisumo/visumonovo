import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { AlertTriangle, Clock } from 'lucide-react'
import { Sidebar } from '@/components/common/Sidebar'
import { TopBar } from '@/components/common/TopBar'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'
import { useSubscription } from '@/hooks/useSubscription'

function TrialBanner() {
  const navigate = useNavigate()
  const { data: sub } = useSubscription()

  if (!sub || sub.status !== 'trialing' || !sub.subscription_end_date) return null

  const daysLeft = Math.ceil(
    (new Date(sub.subscription_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  if (daysLeft > 7) return null

  const expired = daysLeft <= 0

  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium ${expired ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>
      <div className="flex items-center gap-2">
        {expired ? <AlertTriangle size={15} /> : <Clock size={15} />}
        {expired
          ? 'Seu período gratuito expirou. Escolha um plano para continuar.'
          : `Seu período gratuito termina em ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}. Garanta seu plano!`}
      </div>
      <button
        onClick={() => navigate('/escolher-plano')}
        className="shrink-0 bg-white/20 hover:bg-white/30 transition-colors rounded-lg px-3 py-1 text-xs font-semibold"
      >
        Ver planos
      </button>
    </div>
  )
}

function TrialExpiredGuard() {
  const navigate = useNavigate()
  const { data: sub, isLoading } = useSubscription()

  useEffect(() => {
    if (isLoading || !sub) return
    if (sub.status !== 'trialing' || !sub.subscription_end_date) return
    const expired = new Date(sub.subscription_end_date).getTime() < Date.now()
    if (expired) navigate('/escolher-plano', { replace: true })
  }, [sub, isLoading, navigate])

  return null
}

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <OnboardingFlow />
      <TrialExpiredGuard />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <TrialBanner />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 safe-bottom">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
