import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { MessageSquare, Clock, CheckCircle2, XCircle, Package, ChevronDown, ChevronUp, Star, Search, BarChart2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { notifyEmail } from '@/lib/email'
import { cn } from '@/lib/utils'
import type { QuoteRequest, QuoteResponse } from '@/types'

// ─── Supplier Review Modal ────────────────────────────────────

function SupplierReviewModal({
  quoteRequestId,
  supplierId,
  requesterId,
  onClose,
}: {
  quoteRequestId: string
  supplierId: string
  requesterId: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [rating, setRating]   = useState(0)
  const [hover, setHover]     = useState(0)
  const [comment, setComment] = useState('')

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('supplier_reviews').insert({
        requester_id:     requesterId,
        supplier_id:      supplierId,
        quote_request_id: quoteRequestId,
        rating,
        comment:          comment.trim() || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-requests'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-reviews', supplierId] })
      toast.success('Avaliação enviada!')
      onClose()
    },
    onError: () => toast.error('Erro ao enviar avaliação.'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Avaliar fornecedor</h3>
          <p className="text-sm text-slate-500 mt-0.5">Como foi a experiência com este fornecedor?</p>
        </div>
        <div className="p-5 space-y-4">
          {/* Stars */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setRating(s)}
                onMouseEnter={() => setHover(s)}
                onMouseLeave={() => setHover(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={32}
                  className={cn(
                    'transition-colors',
                    s <= (hover || rating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-200'
                  )}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-center text-sm text-slate-500">
              {['', 'Muito ruim', 'Ruim', 'Regular', 'Bom', 'Excelente'][rating]}
            </p>
          )}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">
              Comentário (opcional)
            </label>
            <textarea
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              placeholder="Descreva sua experiência com o fornecedor..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>
        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button
            className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="flex-1 h-10 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
            disabled={rating === 0 || submit.isPending}
            onClick={() => submit.mutate()}
          >
            {submit.isPending ? 'Enviando...' : 'Enviar avaliação'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────

type QRWithRelations = QuoteRequest & {
  requester: { full_name: string | null; company_name: string | null; email: string }
  supplier:  { full_name: string | null; company_name: string | null; email: string }
  response:  QuoteResponse | null
}

// ─── Status helpers ───────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  pending:    'Aguardando',
  responded:  'Respondida',
  closed:     'Encerrada',
}
const STATUS_COLOR: Record<string, string> = {
  pending:    'bg-amber-100 text-amber-700',
  responded:  'bg-green-100 text-green-700',
  closed:     'bg-slate-100 text-slate-500',
}

// ─── Respond Modal ────────────────────────────────────────────

function RespondModal({
  request,
  onClose,
}: {
  request: QRWithRelations
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [price, setPrice]   = useState('')
  const [days,  setDays]    = useState('')
  const [msg,   setMsg]     = useState('')

  const requesterName =
    request.requester.company_name || request.requester.full_name || request.requester.email

  const respond = useMutation({
    mutationFn: async () => {
      // Insert response
      const { error: rErr } = await supabase.from('quote_responses').insert({
        quote_request_id: request.id,
        unit_price:       price ? parseFloat(price.replace(',', '.')) : null,
        message:          msg.trim(),
        estimated_days:   days ? parseInt(days) : null,
      })
      if (rErr) throw rErr

      // Update request status
      const { error: uErr } = await supabase
        .from('quote_requests')
        .update({ status: 'responded', updated_at: new Date().toISOString() })
        .eq('id', request.id)
      if (uErr) throw uErr
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-requests'] })
      notifyEmail('cotacao_respondida', { quoteRequestId: request.id })
      toast.success('Resposta enviada!')
      onClose()
    },
    onError: () => toast.error('Erro ao enviar resposta.'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Responder cotação</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Para <strong>{requesterName}</strong>
            {request.product_title && <> — {request.product_title}</>}
          </p>
        </div>

        <div className="p-5 space-y-4">
          {/* Solicitação original */}
          <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600">
            <p className="font-medium text-slate-700 mb-1">Pedido:</p>
            <p>{request.message}</p>
            {request.quantity && (
              <p className="mt-1 text-slate-500">Quantidade: {request.quantity}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                Valor unitário (R$)
              </label>
              <input
                className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0,00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                Prazo (dias)
              </label>
              <input
                className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="ex: 7"
                type="number"
                min={1}
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">
              Mensagem *
            </label>
            <textarea
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={4}
              placeholder="Descreva as condições, disponibilidade, formas de pagamento..."
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
            />
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button
            className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="flex-1 h-10 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
            disabled={!msg.trim() || respond.isPending}
            onClick={() => respond.mutate()}
          >
            {respond.isPending ? 'Enviando...' : 'Enviar resposta'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Quote Row ────────────────────────────────────────────────

function QuoteRow({
  item,
  isSupplier,
  hasReview,
  currentUserId,
}: {
  item: QRWithRelations
  isSupplier: boolean
  hasReview?: boolean
  currentUserId?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [responding, setResponding] = useState(false)
  const [reviewing, setReviewing] = useState(false)

  const otherName = isSupplier
    ? (item.requester.company_name || item.requester.full_name || item.requester.email)
    : (item.supplier.company_name  || item.supplier.full_name  || item.supplier.email)

  return (
    <>
      {responding && (
        <RespondModal request={item} onClose={() => setResponding(false)} />
      )}
      {reviewing && currentUserId && (
        <SupplierReviewModal
          quoteRequestId={item.id}
          supplierId={item.supplier_id}
          requesterId={currentUserId}
          onClose={() => setReviewing(false)}
        />
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Header row */}
        <div
          className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
            <Package size={16} className="text-primary-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-slate-900 text-sm truncate">{otherName}</p>
              {item.product_title && (
                <span className="text-xs text-slate-400 truncate">· {item.product_title}</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>

          <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${STATUS_COLOR[item.status]}`}>
            {STATUS_LABEL[item.status]}
          </span>

          {expanded
            ? <ChevronUp size={16} className="text-slate-400 shrink-0" />
            : <ChevronDown size={16} className="text-slate-400 shrink-0" />
          }
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="border-t border-slate-100 p-4 space-y-4">
            {/* Original request */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                {isSupplier ? 'Pedido do cliente' : 'Seu pedido'}
              </p>
              <p className="text-sm text-slate-700">{item.message}</p>
              {item.quantity && (
                <p className="text-xs text-slate-500 mt-1">Quantidade: {item.quantity}</p>
              )}
            </div>

            {/* Response */}
            {item.response ? (
              <>
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide flex items-center gap-1.5">
                    <CheckCircle2 size={12} /> Resposta do fornecedor
                  </p>
                  <p className="text-sm text-slate-700">{item.response.message}</p>
                  <div className="flex gap-4 text-sm">
                    {item.response.unit_price != null && (
                      <span className="text-green-700 font-bold">
                        R$ {item.response.unit_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                    {item.response.estimated_days != null && (
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock size={12} /> {item.response.estimated_days} dias
                      </span>
                    )}
                  </div>
                </div>

                {/* Review button — only for requester side */}
                {!isSupplier && (
                  hasReview ? (
                    <div className="flex items-center gap-1.5 text-sm text-amber-600 font-medium">
                      <Star size={14} className="fill-amber-400 text-amber-400" />
                      Você já avaliou este fornecedor
                    </div>
                  ) : (
                    <button
                      className="flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                      onClick={() => setReviewing(true)}
                    >
                      <Star size={14} /> Avaliar fornecedor
                    </button>
                  )
                )}
              </>
            ) : isSupplier && item.status === 'pending' ? (
              <button
                className="w-full h-10 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                onClick={() => setResponding(true)}
              >
                <MessageSquare size={14} /> Responder cotação
              </button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Clock size={14} /> Aguardando resposta do fornecedor...
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────

type StatusFilter = 'all' | 'pending' | 'responded'
type PeriodFilter = 'all' | '7d' | '30d' | '90d'

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all',       label: 'Todas'      },
  { value: 'pending',   label: 'Pendentes'  },
  { value: 'responded', label: 'Respondidas'},
]

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: 'all', label: 'Todos os períodos' },
  { value: '7d',  label: 'Últimos 7 dias'    },
  { value: '30d', label: 'Último mês'        },
  { value: '90d', label: 'Últimos 3 meses'   },
]

function periodCutoff(p: PeriodFilter): Date | null {
  if (p === 'all') return null
  const days = p === '7d' ? 7 : p === '30d' ? 30 : 90
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

export function QuoteRequestsPage() {
  const { profile } = useAuthStore()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all')
  const [search, setSearch] = useState('')

  const isSupplier =
    profile?.user_type === 'fornecedor' ||
    profile?.user_type === 'fornecedor_empresa'

  // IDs of quote_requests already reviewed by this user (requester side only)
  const { data: reviewedIds = [] } = useQuery({
    queryKey: ['my-quote-reviews', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('supplier_reviews')
        .select('quote_request_id')
        .eq('requester_id', profile!.id)
      return (data ?? []).map((r) => r.quote_request_id as string)
    },
    enabled: !!profile && !isSupplier,
  })

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['quote-requests', profile?.id, isSupplier],
    queryFn: async () => {
      const field = isSupplier ? 'supplier_id' : 'requester_id'
      const { data, error } = await supabase
        .from('quote_requests')
        .select(`
          *,
          requester:profiles!requester_id(full_name, company_name, email),
          supplier:profiles!supplier_id(full_name, company_name, email),
          response:quote_responses(*)
        `)
        .eq(field, profile!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as unknown as QRWithRelations[]).map((r) => ({
        ...r,
        response: Array.isArray(r.response) ? r.response[0] ?? null : r.response,
      }))
    },
    enabled: !!profile,
  })

  const filtered = useMemo(() => {
    const q      = search.trim().toLowerCase()
    const cutoff = periodCutoff(periodFilter)
    return items.filter((i) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'pending' && i.status === 'pending') ||
        (statusFilter === 'responded' && i.status !== 'pending')

      if (!matchesStatus) return false

      if (cutoff && new Date(i.created_at) < cutoff) return false

      if (!q) return true

      const otherName = isSupplier
        ? (i.requester.company_name || i.requester.full_name || i.requester.email || '')
        : (i.supplier.company_name  || i.supplier.full_name  || i.supplier.email  || '')
      return (
        i.message?.toLowerCase().includes(q) ||
        otherName.toLowerCase().includes(q) ||
        (i.product_title ?? '').toLowerCase().includes(q)
      )
    })
  }, [items, statusFilter, periodFilter, search, isSupplier])

  const pendingCount   = items.filter((i) => i.status === 'pending').length
  const respondedCount = items.filter((i) => i.status !== 'pending').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {isSupplier ? 'Cotações recebidas' : 'Minhas cotações'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {isSupplier
            ? 'Pedidos de cotação enviados por clientes e profissionais'
            : 'Cotações solicitadas para fornecedores'}
        </p>
      </div>

      {/* Filters */}
      {!isLoading && items.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Status tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 shrink-0">
            {STATUS_TABS.map((tab) => {
              const count = tab.value === 'all' ? items.length : tab.value === 'pending' ? pendingCount : respondedCount
              return (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
                    statusFilter === tab.value
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {tab.label}
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
                    statusFilter === tab.value ? 'bg-primary-100 text-primary-700' : 'bg-slate-200 text-slate-500'
                  )}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Period */}
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
            className="h-9 px-3 rounded-xl border border-slate-200 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white shrink-0"
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por descrição, nome ou produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>
        </div>
      )}

      {/* Price comparison — requester only */}
      {!isSupplier && (() => {
        const withPrice = items.filter(
          (i) => i.status !== 'pending' && i.response?.unit_price != null
        ).sort((a, b) => (a.response!.unit_price ?? 0) - (b.response!.unit_price ?? 0))
        if (withPrice.length < 2) return null
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2 text-sm">
              <BarChart2 size={15} className="text-primary-500" />
              Comparativo de preços ({withPrice.length} cotações respondidas)
            </h2>
            <div className="space-y-2">
              {withPrice.map((i, idx) => {
                const supplierName = i.supplier.company_name || i.supplier.full_name || i.supplier.email
                const price = i.response!.unit_price!
                const max   = withPrice[withPrice.length - 1].response!.unit_price!
                const pct   = max > 0 ? Math.round((price / max) * 100) : 100
                const isBest = idx === 0
                return (
                  <div key={i.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 font-medium flex items-center gap-1.5">
                        {isBest && <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded-full">Menor</span>}
                        {supplierName}
                        {i.product_title && <span className="text-slate-400 font-normal">· {i.product_title}</span>}
                      </span>
                      <span className="font-bold text-slate-900 shrink-0">
                        R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        {i.response!.estimated_days != null && (
                          <span className="font-normal text-slate-400"> · {i.response!.estimated_days}d</span>
                        )}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', isBest ? 'bg-green-500' : 'bg-primary-400')} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <XCircle size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-600">Nenhuma cotação encontrada</p>
          {!isSupplier && (
            <p className="text-sm text-slate-400 mt-1">
              Acesse o catálogo de fornecedores e solicite uma cotação.
            </p>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-slate-400 py-12">Nenhuma cotação corresponde aos filtros.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <QuoteRow
              key={item.id}
              item={item}
              isSupplier={isSupplier}
              hasReview={reviewedIds.includes(item.id)}
              currentUserId={profile?.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
