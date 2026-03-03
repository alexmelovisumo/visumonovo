// ============================================================
// VISUMO — Edge Function: pagseguro-webhook
// Recebe notificações do PagBank e atualiza user_subscriptions automaticamente.
//
// Fluxo: usuário paga via checkout PagBank → PagBank chama esta URL →
//        assinatura é ativada/cancelada sem intervenção manual.
//
// URL: https://<projeto>.supabase.co/functions/v1/pagseguro-webhook
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// Status PagBank → SubscriptionStatus interno
function mapStatus(pgStatus: string): string {
  switch (pgStatus?.toUpperCase()) {
    case 'PAID':
    case 'AVAILABLE':
    case 'ACTIVE':
      return 'active'
    case 'WAITING':
    case 'IN_ANALYSIS':
    case 'AUTHORIZED':
      return 'pending'
    case 'CANCELLED':
    case 'CANCELED':
    case 'DECLINED':
      return 'cancelled'
    case 'OVERDUE':
    case 'SUSPENDED':
      return 'expired'
    default:
      return 'pending'
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  console.log('[pagseguro-webhook] Payload recebido:', JSON.stringify(body))

  // PagBank Checkout envia: { id: 'CHEC_...', reference_id: '<nossa subscription_id>', charges: [...] }
  // O reference_id é o que passamos na criação do checkout = nosso subscription UUID.
  //
  // Status: pode vir no topo (body.status) ou dentro de charges[0].status
  const referenceId = body.reference_id as string | undefined
  const pgId        = body.id as string | undefined

  const rawStatus = (body.status as string | undefined)
    ?? ((body.charges as { status?: string }[] | undefined)?.[0]?.status)

  if (!rawStatus) {
    console.warn('[pagseguro-webhook] Payload sem status — ignorando')
    return new Response('OK', { status: 200 }) // 200 para o PagBank não reenviar
  }

  const newStatus = mapStatus(rawStatus)
  const supabase  = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  let sub: { id: string; user_id: string; plan_id: string } | null = null

  // Estratégia 1: reference_id = nosso subscription UUID → busca direto por id
  if (referenceId) {
    const { data } = await supabase
      .from('user_subscriptions')
      .select('id, user_id, plan_id')
      .eq('id', referenceId)
      .maybeSingle()
    sub = data
  }

  // Estratégia 2 (fallback): busca pelo id do checkout/order salvo na coluna mercadopago_subscription_id
  if (!sub && pgId) {
    const { data } = await supabase
      .from('user_subscriptions')
      .select('id, user_id, plan_id')
      .eq('mercadopago_subscription_id', pgId)
      .maybeSingle()
    sub = data
  }

  if (!sub) {
    console.warn('[pagseguro-webhook] Assinatura não encontrada. reference_id:', referenceId, 'pgId:', pgId)
    return new Response('OK', { status: 200 }) // 200 para não reenviar
  }

  // Monta patch de atualização
  const patch: Record<string, unknown> = {
    status:     newStatus,
    updated_at: new Date().toISOString(),
  }

  if (newStatus === 'active') {
    patch.subscription_start_date = new Date().toISOString()
    // Data de vencimento: 1 ano a partir de hoje (para planos anuais)
    const endDate = new Date()
    endDate.setFullYear(endDate.getFullYear() + 1)
    patch.subscription_end_date = endDate.toISOString()
  }

  const { error: updateErr } = await supabase
    .from('user_subscriptions')
    .update(patch)
    .eq('id', sub.id)

  if (updateErr) {
    console.error('[pagseguro-webhook] Erro ao atualizar:', updateErr.message)
    return new Response('DB update error', { status: 500 })
  }

  console.log(`[pagseguro-webhook] Assinatura ${sub.id} → ${newStatus}`)
  return new Response('OK', { status: 200 })
})
