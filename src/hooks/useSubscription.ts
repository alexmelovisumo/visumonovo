import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { UserSubscription, SubscriptionPlan } from '@/types'

// ─── Fetch current subscription ──────────────────────────────

async function fetchMySubscription(userId: string) {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*, plan:subscription_plans(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as (UserSubscription & { plan: SubscriptionPlan }) | null
}

// ─── Fetch plans by user type ─────────────────────────────────

export async function fetchPlansByUserType(userType: string) {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('user_type', userType)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) throw error
  return (data ?? []) as SubscriptionPlan[]
}

// ─── Ensure profile exists (fallback se trigger falhou) ───────
// O trigger handle_new_user tem EXCEPTION WHEN OTHERS silencioso.
// Esta função garante que o perfil exista antes de criar a assinatura.

async function ensureProfileExists(userId: string): Promise<void> {
  // Verifica se o perfil já existe
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (existing) return // perfil já existe, nada a fazer

  // Perfil não existe — cria a partir do metadata do auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const meta = user.user_metadata ?? {}

  const { error } = await supabase.from('profiles').insert({
    id:           userId,
    email:        user.email ?? '',
    user_type:    (meta.user_type as string) || 'empresa',
    full_name:    meta.full_name || null,
    phone:        meta.phone || null,
    city:         meta.city || null,
    state:        meta.state || null,
    company_name: meta.company_name || null,
  })

  if (error && !error.message.includes('duplicate') && !error.message.includes('unique')) {
    console.warn('ensureProfileExists: não foi possível criar perfil:', error.message)
  }
}

// ─── Create free subscription ─────────────────────────────────

export async function createFreeSubscription(userId: string, planId: string) {
  await ensureProfileExists(userId)

  const { error } = await supabase
    .from('user_subscriptions')
    .insert({
      user_id:       userId,
      plan_id:       planId,
      status:        'active',
      billing_cycle: 'monthly',
      current_price: 0,
    })

  if (error) throw error
}

// ─── Create pending subscription (paid) ──────────────────────

export async function createPendingSubscription(
  userId: string,
  planId: string,
  billingCycle: 'monthly' | 'yearly',
  price: number
) {
  await ensureProfileExists(userId)

  const { data, error } = await supabase
    .from('user_subscriptions')
    .insert({
      user_id:       userId,
      plan_id:       planId,
      status:        'pending',
      billing_cycle: billingCycle,
      current_price: price,
    })
    .select()
    .single()

  if (error) throw error
  return data as UserSubscription
}

// ─── Create PagBank hosted checkout via Edge Function ────────

export async function createCheckout(
  subscriptionId: string,
  planId: string,
  billingCycle: 'monthly' | 'yearly'
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Sessão expirada')

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscription_id: subscriptionId, plan_id: planId, billing_cycle: billingCycle }),
    }
  )

  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.description ?? json?.error ?? 'Erro ao criar checkout')
  if (!json.checkout_url) throw new Error('URL de pagamento não retornada')
  return json.checkout_url
}

// ─── Hook ────────────────────────────────────────────────────

export function useSubscription() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['subscription', user?.id],
    queryFn:  () => fetchMySubscription(user!.id),
    enabled:  !!user?.id,
    staleTime: 1000 * 60 * 5,
  })
}

// ─── Helpers ─────────────────────────────────────────────────

export function isSubscriptionActive(sub: (UserSubscription & { plan: SubscriptionPlan }) | null | undefined) {
  if (!sub) return false
  return sub.status === 'active' || sub.status === 'trial'
}

export function getDaysUntilExpiry(sub: UserSubscription | null | undefined): number | null {
  if (!sub?.subscription_end_date) return null
  const diff = new Date(sub.subscription_end_date).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}
