import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const APP_URL    = Deno.env.get('APP_URL') ?? 'https://visumo.com.br'
const FROM       = 'Visumo <noreply@visumo.com.br>'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// ─── Base layout ──────────────────────────────────────────────

function layout(headerColor: string, headerTitle: string, headerSub: string, body: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f1f5f9; }
  .wrap { max-width: 560px; margin: 32px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
  .hdr  { background: ${headerColor}; padding: 28px 32px; }
  .hdr h1 { color: #fff; margin: 0 0 4px; font-size: 20px; font-weight: 700; }
  .hdr p  { color: rgba(255,255,255,.75); margin: 0; font-size: 13px; }
  .bdy  { padding: 28px 32px; }
  .bdy p  { color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin: 16px 0; }
  .lbl  { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #94a3b8; font-weight: 600; margin-bottom: 3px; }
  .val  { font-size: 15px; color: #1e293b; font-weight: 500; }
  .row  { margin-top: 12px; }
  .btn  { display: inline-block; background: #4f46e5; color: #fff !important; text-decoration: none; padding: 13px 28px; border-radius: 10px; font-weight: 600; font-size: 15px; margin: 4px 0 20px; }
  .ftr  { border-top: 1px solid #f1f5f9; padding: 18px 32px; }
  .ftr p { color: #94a3b8; font-size: 12px; margin: 0; }
  @media (max-width: 600px) { .wrap { margin: 0; border-radius: 0; } .bdy, .hdr, .ftr { padding: 20px; } }
</style>
</head>
<body><div class="wrap">
  <div class="hdr"><h1>${headerTitle}</h1><p>${headerSub}</p></div>
  <div class="bdy">${body}</div>
  <div class="ftr"><p>© ${new Date().getFullYear()} Visumo · Marketplace de Comunicação Visual<br>Este e-mail foi enviado automaticamente — não responda.</p></div>
</div></body></html>`
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// ─── Templates ────────────────────────────────────────────────

function tplNovaProposta(d: {
  clientName: string; projectTitle: string; professionalName: string
  proposedValue: number; estimatedDays: number; projectId: string
}) {
  return layout(
    'linear-gradient(135deg,#4f46e5,#3730a3)',
    'Nova proposta recebida',
    d.projectTitle,
    `<p>Olá, <strong>${d.clientName}</strong>!</p>
     <p>Você recebeu uma nova proposta para o seu projeto <strong>"${d.projectTitle}"</strong>.</p>
     <div class="card">
       <div class="lbl">Profissional</div><div class="val">${d.professionalName}</div>
       <div class="row"><div class="lbl">Valor proposto</div><div class="val">${fmt(d.proposedValue)}</div></div>
       <div class="row"><div class="lbl">Prazo estimado</div><div class="val">${d.estimatedDays} dias</div></div>
     </div>
     <a class="btn" href="${APP_URL}/dashboard/projeto/${d.projectId}">Ver proposta</a>
     <p style="font-size:13px;color:#64748b">Acesse o painel para aceitar, recusar ou iniciar uma negociação.</p>`,
  )
}

function tplPropostaAceita(d: {
  professionalName: string; clientName: string; projectTitle: string; projectId: string
}) {
  return layout(
    'linear-gradient(135deg,#059669,#047857)',
    'Sua proposta foi aceita! 🎉',
    d.projectTitle,
    `<p>Olá, <strong>${d.professionalName}</strong>!</p>
     <p>Ótima notícia: <strong>${d.clientName}</strong> aceitou sua proposta para o projeto <strong>"${d.projectTitle}"</strong>.</p>
     <p>Agora vocês podem alinhar os detalhes diretamente pelo chat da plataforma.</p>
     <a class="btn" href="${APP_URL}/dashboard/mensagens">Abrir conversa</a>`,
  )
}

function tplPropostaRecusada(d: {
  professionalName: string; projectTitle: string; projectId: string
}) {
  return layout(
    'linear-gradient(135deg,#64748b,#475569)',
    'Proposta não selecionada',
    d.projectTitle,
    `<p>Olá, <strong>${d.professionalName}</strong>.</p>
     <p>Sua proposta para o projeto <strong>"${d.projectTitle}"</strong> não foi selecionada desta vez.</p>
     <p>Não desanime — continue explorando novos projetos disponíveis na plataforma!</p>
     <a class="btn" style="background:#4f46e5" href="${APP_URL}/dashboard/projetos">Explorar projetos</a>`,
  )
}

function tplProjetoFinalizado(d: {
  recipientName: string; projectTitle: string; projectId: string
}) {
  return layout(
    'linear-gradient(135deg,#0ea5e9,#0284c7)',
    'Projeto concluído ✓',
    d.projectTitle,
    `<p>Olá, <strong>${d.recipientName}</strong>!</p>
     <p>O projeto <strong>"${d.projectTitle}"</strong> foi marcado como concluído.</p>
     <p>Que tal deixar uma avaliação? Seu feedback ajuda toda a comunidade Visumo a crescer!</p>
     <a class="btn" href="${APP_URL}/dashboard/projeto/${d.projectId}">Ver projeto</a>`,
  )
}

function tplCotacaoRespondida(d: {
  requesterName: string; supplierName: string; productTitle: string | null
}) {
  return layout(
    'linear-gradient(135deg,#0ea5e9,#0284c7)',
    'Sua cotação foi respondida!',
    d.productTitle ?? 'Cotação geral',
    `<p>Olá, <strong>${d.requesterName}</strong>!</p>
     <p><strong>${d.supplierName}</strong> respondeu à sua solicitação de cotação${d.productTitle ? ` para <strong>"${d.productTitle}"</strong>` : ''}.</p>
     <p>Acesse o painel para ver o preço, prazo e mensagem do fornecedor.</p>
     <a class="btn" href="${APP_URL}/dashboard/cotacoes">Ver resposta</a>`,
  )
}

// ─── Send ─────────────────────────────────────────────────────

async function send(to: string, subject: string, html: string) {
  if (!RESEND_KEY) throw new Error('RESEND_API_KEY not configured')
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  })
  if (!res.ok) throw new Error(`Resend error: ${await res.text()}`)
}

// ─── Handler ──────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const { type, proposalId, projectId, quoteRequestId } = await req.json() as {
      type: string; proposalId?: string; projectId?: string; quoteRequestId?: string
    }

    // ── Proposal-based events ──────────────────────────────────
    if (type === 'nova_proposta' || type === 'proposta_aceita' || type === 'proposta_recusada') {
      if (!proposalId) throw new Error('proposalId required')

      const { data: p, error } = await supabase
        .from('proposals')
        .select(`
          id, proposed_value, estimated_days, project_id,
          project:projects(id, title, client:profiles!client_id(full_name, email)),
          professional:profiles!professional_id(full_name, email)
        `)
        .eq('id', proposalId)
        .single()

      if (error || !p) throw new Error(`Proposal not found: ${error?.message}`)

      type ClientRel = { id: string; title: string; client: { full_name: string | null; email: string } }
      type ProfRel   = { full_name: string | null; email: string }

      const proj = p.project as unknown as ClientRel
      const prof = p.professional as unknown as ProfRel

      if (type === 'nova_proposta') {
        await send(
          proj.client.email,
          `Nova proposta recebida — ${proj.title}`,
          tplNovaProposta({
            clientName:       proj.client.full_name ?? proj.client.email,
            projectTitle:     proj.title,
            professionalName: prof.full_name ?? prof.email,
            proposedValue:    p.proposed_value,
            estimatedDays:    p.estimated_days,
            projectId:        proj.id,
          }),
        )
      } else if (type === 'proposta_aceita') {
        await send(
          prof.email,
          `Sua proposta foi aceita — ${proj.title}`,
          tplPropostaAceita({
            professionalName: prof.full_name ?? prof.email,
            clientName:       proj.client.full_name ?? proj.client.email,
            projectTitle:     proj.title,
            projectId:        proj.id,
          }),
        )
      } else {
        await send(
          prof.email,
          `Sobre sua proposta — ${proj.title}`,
          tplPropostaRecusada({
            professionalName: prof.full_name ?? prof.email,
            projectTitle:     proj.title,
            projectId:        proj.id,
          }),
        )
      }
    }

    // ── Project completed ──────────────────────────────────────
    if (type === 'projeto_finalizado') {
      if (!projectId) throw new Error('projectId required')

      const { data: project, error: pErr } = await supabase
        .from('projects')
        .select('id, title, client:profiles!client_id(full_name, email)')
        .eq('id', projectId)
        .single()

      if (pErr || !project) throw new Error(`Project not found: ${pErr?.message}`)

      type ClientRel = { full_name: string | null; email: string }
      const client = project.client as unknown as ClientRel

      const { data: accepted } = await supabase
        .from('proposals')
        .select('professional:profiles!professional_id(full_name, email)')
        .eq('project_id', projectId)
        .eq('status', 'accepted')
        .maybeSingle()

      type ProfRel = { full_name: string | null; email: string }
      const prof = accepted?.professional as unknown as ProfRel | undefined

      await send(
        client.email,
        `Projeto concluído: ${project.title}`,
        tplProjetoFinalizado({
          recipientName: client.full_name ?? client.email,
          projectTitle:  project.title,
          projectId:     project.id,
        }),
      )

      if (prof) {
        await send(
          prof.email,
          `Projeto concluído: ${project.title}`,
          tplProjetoFinalizado({
            recipientName: prof.full_name ?? prof.email,
            projectTitle:  project.title,
            projectId:     project.id,
          }),
        )
      }
    }

    // ── Quote response ─────────────────────────────────────────
    if (type === 'cotacao_respondida') {
      if (!quoteRequestId) throw new Error('quoteRequestId required')

      const { data: qr, error: qErr } = await supabase
        .from('quote_requests')
        .select(`
          id, product_title,
          requester:profiles!requester_id(full_name, email),
          supplier:profiles!supplier_id(full_name, company_name, email)
        `)
        .eq('id', quoteRequestId)
        .single()

      if (qErr || !qr) throw new Error(`Quote request not found: ${qErr?.message}`)

      type ReqRel = { full_name: string | null; email: string }
      type SupRel = { full_name: string | null; company_name: string | null; email: string }

      const requester = qr.requester as unknown as ReqRel
      const supplier  = qr.supplier  as unknown as SupRel

      await send(
        requester.email,
        `Sua cotação foi respondida — ${qr.product_title ?? 'Cotação geral'}`,
        tplCotacaoRespondida({
          requesterName: requester.full_name ?? requester.email,
          supplierName:  supplier.company_name ?? supplier.full_name ?? supplier.email,
          productTitle:  qr.product_title ?? null,
        }),
      )
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[send-email]', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
