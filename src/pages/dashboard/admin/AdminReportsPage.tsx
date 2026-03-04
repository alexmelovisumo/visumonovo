import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Users, CreditCard, ClipboardList, Download, FileSpreadsheet } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { USER_TYPE_LABELS, SUBSCRIPTION_STATUS_LABELS } from '@/utils/constants'

// ─── CSV helper ───────────────────────────────────────────────

function downloadCsv(filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) {
  const escape = (v: string | number | boolean | null | undefined) =>
    `"${String(v ?? '').replace(/"/g, '""')}"`

  const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\r\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function fmtDate(d: string | null) {
  return d ? format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }) : ''
}

// ─── Report Card ──────────────────────────────────────────────

function ReportCard({
  icon,
  title,
  description,
  count,
  countLabel,
  loading,
  onExport,
}: {
  icon: React.ReactNode
  title: string
  description: string
  count: number | null
  countLabel: string
  loading: boolean
  onExport: () => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
          {icon}
        </div>
        {count !== null && (
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {count.toLocaleString('pt-BR')} {countLabel}
          </span>
        )}
      </div>

      <div>
        <h3 className="font-bold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{description}</p>
      </div>

      <button
        onClick={onExport}
        disabled={loading}
        className="mt-auto flex items-center justify-center gap-2 h-10 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-60"
      >
        {loading
          ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <Download size={15} />
        }
        {loading ? 'Gerando...' : 'Exportar CSV'}
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function AdminReportsPage() {
  const [loadingUsers,  setLoadingUsers]  = useState(false)
  const [loadingSubs,   setLoadingSubs]   = useState(false)
  const [loadingQuotes, setLoadingQuotes] = useState(false)

  // Counts for display
  const { data: counts } = useQuery({
    queryKey: ['admin-report-counts'],
    queryFn: async () => {
      const [u, s, q] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('user_subscriptions').select('id', { count: 'exact', head: true }),
        supabase.from('quote_requests').select('id', { count: 'exact', head: true }),
      ])
      return {
        users:  u.count ?? 0,
        subs:   s.count ?? 0,
        quotes: q.count ?? 0,
      }
    },
  })

  // ── Export: Usuários ────────────────────────────────────────

  async function exportUsers() {
    setLoadingUsers(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, user_type, company_name, city, state, phone, is_verified, is_active, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error

      downloadCsv(
        `visumo-usuarios-${format(new Date(), 'yyyy-MM-dd')}.csv`,
        ['Nome', 'E-mail', 'Tipo', 'Empresa', 'Cidade', 'Estado', 'Telefone', 'Verificado', 'Status', 'Cadastro'],
        data.map((u) => [
          u.full_name,
          u.email,
          USER_TYPE_LABELS[u.user_type as keyof typeof USER_TYPE_LABELS] ?? u.user_type,
          u.company_name,
          u.city,
          u.state,
          u.phone,
          u.is_verified ? 'Sim' : 'Não',
          u.is_active ? 'Ativo' : 'Inativo',
          fmtDate(u.created_at),
        ]),
      )
    } finally {
      setLoadingUsers(false)
    }
  }

  // ── Export: Assinaturas ─────────────────────────────────────

  async function exportSubs() {
    setLoadingSubs(true)
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          status, billing_cycle, current_price, discount_applied, coupon_code,
          subscription_start_date, subscription_end_date, trial_end_date, created_at,
          user:profiles(full_name, email, user_type),
          plan:subscription_plans(display_name)
        `)
        .order('created_at', { ascending: false })
      if (error) throw error

      type Row = typeof data[0] & {
        user: { full_name: string | null; email: string; user_type: string } | { full_name: string | null; email: string; user_type: string }[]
        plan: { display_name: string } | { display_name: string }[]
      }

      downloadCsv(
        `visumo-assinaturas-${format(new Date(), 'yyyy-MM-dd')}.csv`,
        ['Nome', 'E-mail', 'Tipo', 'Plano', 'Status', 'Ciclo', 'Valor (R$)', 'Desconto (%)', 'Cupom', 'Início', 'Vencimento', 'Criado em'],
        (data as unknown as Row[]).map((s) => {
          const u = Array.isArray(s.user) ? s.user[0] : s.user
          const p = Array.isArray(s.plan) ? s.plan[0] : s.plan
          return [
            u?.full_name,
            u?.email,
            USER_TYPE_LABELS[u?.user_type as keyof typeof USER_TYPE_LABELS] ?? u?.user_type,
            p?.display_name,
            SUBSCRIPTION_STATUS_LABELS[s.status as keyof typeof SUBSCRIPTION_STATUS_LABELS] ?? s.status,
            s.billing_cycle === 'monthly' ? 'Mensal' : 'Anual',
            s.current_price?.toFixed(2).replace('.', ','),
            s.discount_applied,
            s.coupon_code,
            fmtDate(s.subscription_start_date),
            s.subscription_end_date ? fmtDate(s.subscription_end_date) : fmtDate(s.trial_end_date),
            fmtDate(s.created_at),
          ]
        }),
      )
    } finally {
      setLoadingSubs(false)
    }
  }

  // ── Export: Cotações ────────────────────────────────────────

  async function exportQuotes() {
    setLoadingQuotes(true)
    try {
      const { data, error } = await supabase
        .from('quote_requests')
        .select(`
          product_title, message, quantity, status, created_at,
          requester:profiles!requester_id(full_name, company_name, email),
          supplier:profiles!supplier_id(full_name, company_name, email),
          response:quote_responses(unit_price, estimated_days, created_at)
        `)
        .order('created_at', { ascending: false })
      if (error) throw error

      type Row = {
        product_title: string | null
        message: string
        quantity: string | null
        status: string
        created_at: string
        requester: { full_name: string | null; company_name: string | null; email: string } | { full_name: string | null; company_name: string | null; email: string }[]
        supplier:  { full_name: string | null; company_name: string | null; email: string } | { full_name: string | null; company_name: string | null; email: string }[]
        response:  { unit_price: number | null; estimated_days: number | null; created_at: string }[] | null
      }

      const STATUS_LABEL: Record<string, string> = {
        pending: 'Aguardando', responded: 'Respondida', closed: 'Encerrada',
      }

      downloadCsv(
        `visumo-cotacoes-${format(new Date(), 'yyyy-MM-dd')}.csv`,
        ['Solicitante', 'E-mail solicitante', 'Fornecedor', 'E-mail fornecedor', 'Produto', 'Mensagem', 'Quantidade', 'Status', 'Valor resposta (R$)', 'Prazo resposta (dias)', 'Data solicitação', 'Data resposta'],
        (data as unknown as Row[]).map((q) => {
          const req  = Array.isArray(q.requester) ? q.requester[0] : q.requester
          const sup  = Array.isArray(q.supplier)  ? q.supplier[0]  : q.supplier
          const resp = Array.isArray(q.response)  ? q.response[0]  : q.response
          return [
            req?.company_name || req?.full_name,
            req?.email,
            sup?.company_name || sup?.full_name,
            sup?.email,
            q.product_title,
            q.message,
            q.quantity,
            STATUS_LABEL[q.status] ?? q.status,
            resp?.unit_price?.toFixed(2).replace('.', ','),
            resp?.estimated_days,
            fmtDate(q.created_at),
            resp?.created_at ? fmtDate(resp.created_at) : '',
          ]
        }),
      )
    } finally {
      setLoadingQuotes(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileSpreadsheet size={24} className="text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
          <p className="text-slate-500 text-sm mt-0.5">Exporte dados da plataforma em formato CSV (compatível com Excel)</p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <ReportCard
          icon={<Users size={22} />}
          title="Usuários"
          description="Todos os perfis cadastrados: nome, e-mail, tipo, localização, status e data de cadastro."
          count={counts?.users ?? null}
          countLabel="registros"
          loading={loadingUsers}
          onExport={exportUsers}
        />
        <ReportCard
          icon={<CreditCard size={22} />}
          title="Assinaturas"
          description="Histórico completo de assinaturas: plano, status, valor, desconto, cupom e datas."
          count={counts?.subs ?? null}
          countLabel="registros"
          loading={loadingSubs}
          onExport={exportSubs}
        />
        <ReportCard
          icon={<ClipboardList size={22} />}
          title="Cotações"
          description="Todas as solicitações de cotação entre clientes e fornecedores, com respostas incluídas."
          count={counts?.quotes ?? null}
          countLabel="registros"
          loading={loadingQuotes}
          onExport={exportQuotes}
        />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
        <strong>Dica:</strong> Os arquivos CSV são gerados com BOM UTF-8 para compatibilidade com o Microsoft Excel.
        Abra pelo menu <em>Dados → De Texto/CSV</em> caso os acentos não apareçam corretamente.
      </div>
    </div>
  )
}
