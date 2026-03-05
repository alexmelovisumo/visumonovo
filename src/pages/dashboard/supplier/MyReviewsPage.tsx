import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Star, ChevronLeft, UserCircle2, MessageSquare, Download } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function downloadCsv(filename: string, rows: string[][]) {
  const BOM = '\uFEFF'
  const content = BOM + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ─── Star display ─────────────────────────────────────────────

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={cn(
            s <= rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'
          )}
        />
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function MyReviewsPage() {
  const { user } = useAuthStore()
  const [exporting, setExporting] = useState(false)

  async function exportCsv(reviews: { rating: number; comment: string | null; created_at: string; requester: { full_name?: string | null; company_name?: string | null } | null }[]) {
    setExporting(true)
    try {
      const rows = [
        ['Avaliador', 'Nota', 'Comentário', 'Data'],
        ...reviews.map((r) => {
          const name = (r.requester as { company_name?: string | null })?.company_name
            || (r.requester as { full_name?: string | null })?.full_name
            || 'Cliente'
          return [
            name,
            String(r.rating),
            r.comment ?? '',
            format(new Date(r.created_at), 'dd/MM/yyyy'),
          ]
        }),
      ]
      downloadCsv(`avaliacoes_${format(new Date(), 'yyyyMMdd')}.csv`, rows)
      toast.success('Exportação concluída')
    } catch {
      toast.error('Erro ao exportar')
    } finally {
      setExporting(false)
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['my-supplier-reviews', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_reviews')
        .select(`
          id, rating, comment, created_at,
          requester:profiles!requester_id(full_name, company_name, avatar_url)
        `)
        .eq('supplier_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error

      const reviews = (data ?? []) as unknown as {
        id: string
        rating: number
        comment: string | null
        created_at: string
        requester: { full_name: string | null; company_name: string | null; avatar_url: string | null } | null
      }[]

      const total = reviews.length
      const avg   = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0

      const dist = [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: reviews.filter((r) => r.rating === star).length,
      }))

      return { reviews, total, avg, dist }
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

  const d = data ?? { reviews: [], total: 0, avg: 0, dist: [] }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/dashboard/home" className="text-slate-400 hover:text-slate-600 transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Minhas avaliações</h1>
            <p className="text-sm text-slate-500">Avaliações recebidas dos seus clientes</p>
          </div>
        </div>
        {d.total > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportCsv(d.reviews)}
            isLoading={exporting}
            className="gap-1.5"
          >
            <Download size={13} /> Exportar CSV
          </Button>
        )}
      </div>

      {d.total === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Star size={28} className="text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">Nenhuma avaliação ainda</h3>
          <p className="text-sm text-slate-400">
            Quando clientes avaliarem suas cotações respondidas, elas aparecerão aqui.
          </p>
        </div>
      ) : (
        <>
          {/* Summary card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row gap-6">
            {/* Average */}
            <div className="flex flex-col items-center justify-center sm:border-r sm:border-slate-100 sm:pr-6 shrink-0">
              <p className="text-5xl font-black text-slate-900">{d.avg.toFixed(1)}</p>
              <Stars rating={Math.round(d.avg)} size={18} />
              <p className="text-xs text-slate-400 mt-1">{d.total} avaliação{d.total !== 1 ? 'ões' : ''}</p>
            </div>

            {/* Distribution */}
            <div className="flex-1 space-y-2">
              {d.dist.map(({ star, count }) => {
                const pct = d.total > 0 ? Math.round((count / d.total) * 100) : 0
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-right text-slate-500">{star}</span>
                    <Star size={11} className="fill-amber-400 text-amber-400 shrink-0" />
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-slate-400">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Reviews list */}
          <div className="space-y-3">
            {d.reviews.map((r) => {
              const name =
                (r.requester as { company_name?: string | null })?.company_name ||
                (r.requester as { full_name?: string | null })?.full_name ||
                'Cliente'
              const avatar = (r.requester as { avatar_url?: string | null })?.avatar_url

              return (
                <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex gap-3">
                  {/* Avatar */}
                  <div className="shrink-0">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <UserCircle2 size={20} className="text-slate-400" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{name}</p>
                        <Stars rating={r.rating} size={13} />
                      </div>
                      <p className="text-xs text-slate-400 shrink-0">
                        {format(new Date(r.created_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    {r.comment && (
                      <div className="mt-2 flex gap-1.5 text-sm text-slate-600">
                        <MessageSquare size={13} className="text-slate-300 shrink-0 mt-0.5" />
                        <p className="leading-relaxed">{r.comment}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
