// ============================================================
// VISUMO — Edge Function: create-checkout
// Cria uma sessão de checkout hospedada no PagBank e retorna a URL de pagamento.
// O PagBank envia webhook automático ao pagseguro-webhook quando o pagamento é confirmado.
// POST /functions/v1/create-checkout
// Body: { subscription_id: string, plan_id: string, billing_cycle: 'monthly' | 'yearly' }
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAGSEGURO_TOKEN    = Deno.env.get('PAGSEGURO_TOKEN') ?? ''
const PAGSEGURO_BASE_URL = Deno.env.get('PAGSEGURO_BASE_URL') ?? 'https://api.pagseguro.com'
const SUPABASE_URL             = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const APP_URL = Deno.env.get('APP_URL') ?? 'https://www.visumo.com.br'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  // Autentica o usuário via JWT do Supabase
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  let body: { subscription_id?: string; plan_id?: string; billing_cycle?: string }
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: corsHeaders })
  }

  const { subscription_id, plan_id, billing_cycle } = body
  if (!subscription_id || !plan_id || !billing_cycle) {
    return new Response('Missing fields', { status: 400, headers: corsHeaders })
  }

  // Busca o plano e o perfil do usuário
  const [{ data: plan }, { data: profile }] = await Promise.all([
    supabase.from('subscription_plans').select('*').eq('id', plan_id).single(),
    supabase.from('profiles').select('email, full_name, phone').eq('id', user.id).single(),
  ])

  if (!plan || !profile) {
    return new Response('Plan or profile not found', { status: 404, headers: corsHeaders })
  }

  const price = billing_cycle === 'yearly'
    ? (plan.price_yearly ?? plan.price_monthly * 12)
    : plan.price_monthly

  const billingLabel = billing_cycle === 'yearly' ? 'Anual' : 'Mensal'

  // Cria sessão de checkout hospedada no PagBank.
  // O cliente preenche os dados de pagamento na página do PagBank (cartão, PIX, boleto).
  // Quando o pagamento é confirmado, PagBank chama notification_urls automaticamente.
  const checkoutPayload = {
    reference_id:    subscription_id,
    expiration_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // expira em 24h
    customer: {
      name:  profile.full_name ?? profile.email,
      email: profile.email,
      phones: profile.phone ? [{
        country: '55',
        area:    profile.phone.replace(/\D/g, '').slice(0, 2),
        number:  profile.phone.replace(/\D/g, '').slice(2),
        type:    'MOBILE',
      }] : undefined,
    },
    items: [{
      reference_id: plan.name,
      name:         `Visumo ${plan.display_name} — ${billingLabel}`,
      quantity:     1,
      unit_amount:  Math.round(price * 100), // em centavos
    }],
    payment_methods: [
      { type: 'CREDIT_CARD', installments: 1 },
      { type: 'DEBIT_CARD' },
      { type: 'BOLETO' },
      { type: 'PIX' },
    ],
    payment_methods_configs: [{
      type: 'CREDIT_CARD',
      config_options: [{ option: 'INSTALLMENTS_LIMIT', value: '1' }],
    }],
    redirect_url:      `${APP_URL}/dashboard/assinatura?status=paid`,
    notification_urls: [`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/pagseguro-webhook`],
  }

  console.log('[create-checkout] Criando checkout PagBank:', JSON.stringify(checkoutPayload))

  const pgRes = await fetch(`${PAGSEGURO_BASE_URL}/checkouts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAGSEGURO_TOKEN}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(checkoutPayload),
  })

  const pgData = await pgRes.json()
  console.log('[create-checkout] PagBank response:', JSON.stringify(pgData))

  if (!pgRes.ok) {
    return new Response(
      JSON.stringify({ error: pgData }),
      { status: pgRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Salva o ID do checkout PagBank na assinatura para correlacionar o webhook
  await supabase
    .from('user_subscriptions')
    .update({ mercadopago_subscription_id: pgData.id })
    .eq('id', subscription_id)

  // PagBank retorna links[] — o rel='PAY' é a URL que o usuário acessa para pagar
  const checkoutUrl = pgData.links?.find(
    (l: { rel?: string; href?: string }) => l.rel === 'PAY'
  )?.href ?? pgData.links?.[0]?.href

  return new Response(
    JSON.stringify({ checkout_url: checkoutUrl, checkout_id: pgData.id }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
