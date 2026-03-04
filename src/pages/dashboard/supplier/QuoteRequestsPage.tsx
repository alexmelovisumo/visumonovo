import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { MessageSquare, Clock, CheckCircle2, XCircle, Package, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { QuoteRequest, QuoteResponse } from '@/types'

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
}: {
  item: QRWithRelations
  isSupplier: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [responding, setResponding] = useState(false)

  const otherName = isSupplier
    ? (item.requester.company_name || item.requester.full_name || item.requester.email)
    : (item.supplier.company_name  || item.supplier.full_name  || item.supplier.email)

  return (
    <>
      {responding && (
        <RespondModal request={item} onClose={() => setResponding(false)} />
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

export function QuoteRequestsPage() {
  const { profile } = useAuthStore()

  const isSupplier =
    profile?.user_type === 'fornecedor' ||
    profile?.user_type === 'fornecedor_empresa'

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

  const pending   = items.filter((i) => i.status === 'pending')
  const responded = items.filter((i) => i.status !== 'pending')

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
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                Pendentes ({pending.length})
              </h2>
              {pending.map((item) => (
                <QuoteRow key={item.id} item={item} isSupplier={isSupplier} />
              ))}
            </div>
          )}
          {responded.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                Respondidas / Encerradas ({responded.length})
              </h2>
              {responded.map((item) => (
                <QuoteRow key={item.id} item={item} isSupplier={isSupplier} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
