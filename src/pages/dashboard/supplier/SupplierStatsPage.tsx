import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Package, ClipboardList, CheckCheck, Clock, TrendingUp, ChevronLeft, BarChart2, Eye, Download,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── CSV helper ───────────────────────────────────────────────

function downloadCsv(filename: string, rows: string[][]) {
  const BOM = '\uFEFF'
  const content = BOM + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ─── Stat Card ────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, color = 'primary',
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  color?: 'primary' | 'green' | 'amber' | 'blue' | 'violet'
}) {
  const bg: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-600',
    green:   'bg-green-50 text-green-600',
    amber:   'bg-amber-50 text-amber-600',
    blue:    'bg-blue-50 text-blue-600',
    violet:  'bg-violet-50 text-violet-600',
  }
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-4">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', bg[color])}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function SupplierStatsPage() {
  const { user } = useAuthStore()
  const [exporting, setExporting] = useState<'products' | 'quotes' | null>(null)

  async function exportProducts() {
    setExporting('products')
    try {
      const { data, error } = await supabase
        .from('products')
        .select('title, description, price, category, is_active, created_at')
        .eq('supplier_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      const rows = [
        ['Título', 'Descrição', 'Preço (R$)', 'Categoria', 'Ativo', 'Criado em'],
        ...(data ?? []).map((p) => [
          p.title,
          p.description ?? '',
          p.price ?? '',
          p.category ?? '',
          p.is_active ? 'Sim' : 'Não',
          format(new Date(p.created_at), 'dd/MM/yyyy'),
        ]),
      ]
      downloadCsv(`produtos_${format(new Date(), 'yyyyMMdd')}.csv`, rows as string[][])
      toast.success('Exportação concluída')
    } catch {
      toast.error('Erro ao exportar produtos')
    } finally {
      setExporting(null)
    }
  }

  async function exportQuotes() {
    setExporting('quotes')
    try {
      const { data, error } = await supabase
        .from('quote_requests')
        .select('product_title, message, status, created_at, requester:profiles!requester_id(full_name, email)')
        .eq('supplier_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      const STATUS_LABELS: Record<string, string> = { pending: 'Pendente', responded: 'Respondida', closed: 'Encerrada' }
      const rows = [
        ['Produto', 'Mensagem', 'Status', 'Solicitante', 'E-mail', 'Data'],
        ...(data ?? []).map((q) => {
          const req = Array.isArray(q.requester) ? q.requester[0] : q.requester
          return [
            q.product_title ?? 'Geral',
            q.message ?? '',
            STATUS_LABELS[q.status] ?? q.status,
            (req as { full_name?: string })?.full_name ?? '',
            (req as { email?: string })?.email ?? '',
            format(new Date(q.created_at), 'dd/MM/yyyy'),
          ]
        }),
      ]
      downloadCsv(`cotacoes_${format(new Date(), 'yyyyMMdd')}.csv`, rows as string[][])
      toast.success('Exportação concluída')
    } catch {
      toast.error('Erro ao exportar cotações')
    } finally {
      setExporting(null)
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-stats-full', user?.id],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const [productsRes, quotesRes, viewsRes] = await Promise.all([
        supabase
          .from('products')
          .select('id, is_active, title')
          .eq('supplier_id', user!.id),
        supabase
          .from('quote_requests')
          .select('id, status, product_title, created_at')
          .eq('supplier_id', user!.id),
        supabase
          .from('profile_views')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', user!.id)
          .gte('viewed_at', cutoff),
      ])

      const products = productsRes.data ?? []
      const quotes   = quotesRes.data ?? []

      const totalProducts  = products.length
      const activeProducts = products.filter((p) => p.is_active).length
      const inactiveProds  = totalProducts - activeProducts

      const totalQuotes     = quotes.length
      const pendingQuotes   = quotes.filter((q) => q.status === 'pending').length
      const respondedQuotes = quotes.filter((q) => q.status === 'responded').length
      const closedQuotes    = quotes.filter((q) => q.status === 'closed').length
      const responseRate    = totalQuotes > 0
        ? Math.round(((respondedQuotes + closedQuotes) / totalQuotes) * 100)
        : 0

      // Most requested products (top 5)
      const productCounts: Record<string, number> = {}
      quotes.forEach((q) => {
        const key = q.product_title ?? 'Geral (sem produto)'
        productCounts[key] = (productCounts[key] ?? 0) + 1
      })
      const topProducts = Object.entries(productCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)

      const views30d = viewsRes.count ?? 0

      return {
        totalProducts, activeProducts, inactiveProds,
        totalQuotes, pendingQuotes, respondedQuotes, closedQuotes,
        responseRate, topProducts, views30d,
      }
    },
    enabled: !!user?.id,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const d = data ?? {
    totalProducts: 0, activeProducts: 0, inactiveProds: 0,
    totalQuotes: 0, pendingQuotes: 0, respondedQuotes: 0, closedQuotes: 0,
    responseRate: 0, topProducts: [], views30d: 0,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/dashboard/home" className="text-slate-400 hover:text-slate-600 transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Estatísticas</h1>
            <p className="text-sm text-slate-500">Acompanhe o desempenho do seu catálogo</p>
          </div>
        </div>
        {d.totalProducts > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={exportProducts}
              isLoading={exporting === 'products'}
              className="gap-1.5"
            >
              <Download size={13} /> Produtos CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={exportQuotes}
              isLoading={exporting === 'quotes'}
              className="gap-1.5"
            >
              <Download size={13} /> Cotações CSV
            </Button>
          </div>
        )}
      </div>

      {/* Top stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Package size={22} />}
          label="Produtos ativos"
          value={d.activeProducts}
          sub={d.inactiveProds > 0 ? `${d.inactiveProds} inativo${d.inactiveProds > 1 ? 's' : ''}` : 'Todos ativos'}
          color="primary"
        />
        <StatCard
          icon={<ClipboardList size={22} />}
          label="Cotações recebidas"
          value={d.totalQuotes}
          sub={`${d.pendingQuotes} aguardando resposta`}
          color="violet"
        />
        <StatCard
          icon={<TrendingUp size={22} />}
          label="Taxa de resposta"
          value={`${d.responseRate}%`}
          sub={d.totalQuotes > 0 ? `${d.respondedQuotes + d.closedQuotes} de ${d.totalQuotes} respondidas` : 'Sem cotações ainda'}
          color="green"
        />
        <StatCard
          icon={<CheckCheck size={22} />}
          label="Cotações encerradas"
          value={d.closedQuotes}
          sub={`${d.respondedQuotes} respondida${d.respondedQuotes !== 1 ? 's' : ''} em aberto`}
          color="blue"
        />
        <StatCard
          icon={<Eye size={22} />}
          label="Visitas ao perfil (30d)"
          value={d.views30d}
          sub="visualizações únicas"
          color="amber"
        />
      </div>

      {/* Quotes breakdown */}
      {d.totalQuotes > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
            <ClipboardList size={16} className="text-primary-500" />
            Status das cotações
          </h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { icon: <Clock size={20} />,    label: 'Pendentes',   value: d.pendingQuotes,   color: 'text-amber-600',   bg: 'bg-amber-50' },
              { icon: <BarChart2 size={20} />, label: 'Respondidas', value: d.respondedQuotes, color: 'text-primary-600', bg: 'bg-primary-50' },
              { icon: <CheckCheck size={20} />,label: 'Encerradas',  value: d.closedQuotes,    color: 'text-green-600',   bg: 'bg-green-50' },
            ].map(({ icon, label, value, color, bg }) => (
              <div key={label} className={cn('rounded-xl p-4 flex flex-col items-center gap-2', bg)}>
                <div className={cn(color)}>{icon}</div>
                <span className="text-2xl font-bold text-slate-900">{value}</span>
                <span className="text-xs text-slate-500">{label}</span>
              </div>
            ))}
          </div>
          <Link
            to="/dashboard/cotacoes"
            className="mt-4 block text-center text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            Ver todas as cotações →
          </Link>
        </div>
      )}

      {/* Top products */}
      {d.topProducts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Package size={16} className="text-primary-500" />
            Produtos mais cotados
          </h2>
          <div className="space-y-3">
            {d.topProducts.map(([title, count], i) => {
              const max = d.topProducts[0][1]
              const pct = max > 0 ? Math.round((count / max) * 100) : 0
              return (
                <div key={title} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-medium flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      {title}
                    </span>
                    <span className="text-slate-500 shrink-0">{count} cotação{count !== 1 ? 'ões' : ''}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {d.totalProducts === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Package size={28} className="text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">Nenhum dado ainda</h3>
          <p className="text-sm text-slate-400 mb-6">Cadastre produtos para começar a receber cotações.</p>
          <Link
            to="/dashboard/produtos"
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Gerenciar produtos
          </Link>
        </div>
      )}

      {/* Tips */}
      {d.totalProducts > 0 && (
        <div className="bg-primary-50 border border-primary-100 rounded-2xl p-5">
          <p className="text-sm font-semibold text-primary-800 mb-2">Dicas para aumentar suas cotações</p>
          <ul className="space-y-1.5 text-sm text-primary-700">
            <li>• Mantenha fotos e descrições detalhadas nos produtos</li>
            <li>• Responda cotações rapidamente para fechar mais negócios</li>
            <li>• Adicione preços nos produtos para facilitar a decisão do cliente</li>
            <li>• Complete seu perfil com telefone e WhatsApp para contato direto</li>
          </ul>
        </div>
      )}
    </div>
  )
}
