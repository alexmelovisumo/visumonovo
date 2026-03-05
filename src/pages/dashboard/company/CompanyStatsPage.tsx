import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  FolderOpen, Handshake, DollarSign, Eye, TrendingUp,
  CheckCircle2, Clock, XCircle, ChevronLeft, Download,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PROJECT_STATUS_LABELS, PROPOSAL_STATUS_LABELS } from '@/utils/constants'

// ─── CSV helpers ──────────────────────────────────────────────

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

// ─── Status bar ───────────────────────────────────────────────

function StatusBar({
  label, count, total, color,
}: {
  label: string
  count: number
  total: number
  color: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-800">{count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function CompanyStatsPage() {
  const { user } = useAuthStore()
  const [exporting, setExporting] = useState<'projects' | 'proposals' | null>(null)

  async function exportProjects() {
    setExporting('projects')
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('title, status, budget_min, budget_max, deadline, city, state, view_count, is_urgent, created_at')
        .eq('client_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      const rows = [
        ['Título', 'Status', 'Orçamento mín (R$)', 'Orçamento máx (R$)', 'Prazo', 'Cidade', 'Estado', 'Visualizações', 'Urgente', 'Criado em'],
        ...(data ?? []).map((p) => [
          p.title,
          PROJECT_STATUS_LABELS[p.status as keyof typeof PROJECT_STATUS_LABELS] ?? p.status,
          p.budget_min ?? '',
          p.budget_max ?? '',
          p.deadline ? format(new Date(p.deadline), 'dd/MM/yyyy') : '',
          p.city ?? '',
          p.state ?? '',
          p.view_count,
          p.is_urgent ? 'Sim' : 'Não',
          format(new Date(p.created_at), 'dd/MM/yyyy'),
        ]),
      ]
      downloadCsv(`projetos_${format(new Date(), 'yyyyMMdd')}.csv`, rows as string[][])
      toast.success('Exportação concluída')
    } catch {
      toast.error('Erro ao exportar projetos')
    } finally {
      setExporting(null)
    }
  }

  async function exportProposals() {
    setExporting('proposals')
    try {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, title')
        .eq('client_id', user!.id)
      const projectIds = (projects ?? []).map((p) => p.id)
      if (projectIds.length === 0) { toast.info('Nenhum projeto para exportar'); setExporting(null); return }
      const projectMap = Object.fromEntries((projects ?? []).map((p) => [p.id, p.title]))
      const { data, error } = await supabase
        .from('proposals')
        .select('project_id, status, proposed_value, estimated_days, message, created_at, professional:profiles!professional_id(full_name, email)')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
      if (error) throw error
      const rows = [
        ['Projeto', 'Profissional', 'E-mail', 'Status', 'Valor proposto (R$)', 'Prazo (dias)', 'Data'],
        ...(data ?? []).map((p) => {
          const prof = Array.isArray(p.professional) ? p.professional[0] : p.professional
          return [
            projectMap[p.project_id] ?? p.project_id,
            (prof as { full_name?: string })?.full_name ?? '',
            (prof as { email?: string })?.email ?? '',
            PROPOSAL_STATUS_LABELS[p.status as keyof typeof PROPOSAL_STATUS_LABELS] ?? p.status,
            p.proposed_value ?? '',
            p.estimated_days ?? '',
            format(new Date(p.created_at), 'dd/MM/yyyy'),
          ]
        }),
      ]
      downloadCsv(`propostas_${format(new Date(), 'yyyyMMdd')}.csv`, rows as string[][])
      toast.success('Exportação concluída')
    } catch {
      toast.error('Erro ao exportar propostas')
    } finally {
      setExporting(null)
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['company-stats', user?.id],
    queryFn: async () => {
      // 1. Projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id, status, view_count')
        .eq('client_id', user!.id)

      const projectList = projects ?? []
      const ids = projectList.map((p) => p.id)

      // 2. Proposals for those projects
      const { data: proposals } = ids.length > 0
        ? await supabase
            .from('proposals')
            .select('status, proposed_value')
            .in('project_id', ids)
        : { data: [] }

      const propList = proposals ?? []

      const totalViews     = projectList.reduce((s, p) => s + (p.view_count ?? 0), 0)
      const totalProjects  = projectList.length
      const openProjects   = projectList.filter((p) => p.status === 'open').length
      const activeProjects = projectList.filter((p) => p.status === 'in_progress').length
      const doneProjects   = projectList.filter((p) => p.status === 'completed').length
      const cancelledProj  = projectList.filter((p) => p.status === 'cancelled').length

      const totalProps    = propList.length
      const pendingProps  = propList.filter((p) => p.status === 'pending').length
      const acceptedProps = propList.filter((p) => p.status === 'accepted').length
      const rejectedProps = propList.filter((p) => p.status === 'rejected').length
      const acceptRate    = totalProps > 0 ? Math.round((acceptedProps / totalProps) * 100) : 0

      const totalInvested = propList
        .filter((p) => p.status === 'accepted')
        .reduce((s, p) => s + (p.proposed_value ?? 0), 0)

      return {
        totalProjects, openProjects, activeProjects, doneProjects, cancelledProj,
        totalProps, pendingProps, acceptedProps, rejectedProps, acceptRate,
        totalViews, totalInvested,
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
    totalProjects: 0, openProjects: 0, activeProjects: 0, doneProjects: 0, cancelledProj: 0,
    totalProps: 0, pendingProps: 0, acceptedProps: 0, rejectedProps: 0, acceptRate: 0,
    totalViews: 0, totalInvested: 0,
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
            <h1 className="text-2xl font-bold text-slate-900">Estatísticas da empresa</h1>
            <p className="text-sm text-slate-500">Acompanhe o desempenho dos seus projetos</p>
          </div>
        </div>
        {d.totalProjects > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={exportProjects}
              isLoading={exporting === 'projects'}
              className="gap-1.5"
            >
              <Download size={13} /> Projetos CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={exportProposals}
              isLoading={exporting === 'proposals'}
              className="gap-1.5"
            >
              <Download size={13} /> Propostas CSV
            </Button>
          </div>
        )}
      </div>

      {/* Top stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<FolderOpen size={22} />}
          label="Total de projetos"
          value={d.totalProjects}
          sub={`${d.openProjects} aberto${d.openProjects !== 1 ? 's' : ''} · ${d.doneProjects} concluído${d.doneProjects !== 1 ? 's' : ''}`}
          color="primary"
        />
        <StatCard
          icon={<Handshake size={22} />}
          label="Propostas recebidas"
          value={d.totalProps}
          sub={`${d.pendingProps} aguardando resposta`}
          color="violet"
        />
        <StatCard
          icon={<TrendingUp size={22} />}
          label="Taxa de aceitação"
          value={`${d.acceptRate}%`}
          sub={d.totalProps > 0 ? `${d.acceptedProps} de ${d.totalProps} aceitas` : 'Sem propostas ainda'}
          color="green"
        />
        <StatCard
          icon={<Eye size={22} />}
          label="Visualizações totais"
          value={d.totalViews}
          sub="soma de todos os projetos"
          color="blue"
        />
      </div>

      {/* Projects breakdown */}
      {d.totalProjects > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
            <FolderOpen size={16} className="text-primary-500" />
            Projetos por status
          </h2>
          <div className="space-y-4">
            <StatusBar label="Abertos"        count={d.openProjects}   total={d.totalProjects} color="bg-green-500" />
            <StatusBar label="Em andamento"   count={d.activeProjects} total={d.totalProjects} color="bg-violet-500" />
            <StatusBar label="Concluídos"     count={d.doneProjects}   total={d.totalProjects} color="bg-blue-500" />
            <StatusBar label="Cancelados"     count={d.cancelledProj}  total={d.totalProjects} color="bg-slate-400" />
          </div>
        </div>
      )}

      {/* Proposals funnel */}
      {d.totalProps > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
            <Handshake size={16} className="text-primary-500" />
            Funil de propostas
          </h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { icon: <Clock size={20} />,       label: 'Pendentes', value: d.pendingProps,  color: 'text-amber-600',  bg: 'bg-amber-50' },
              { icon: <CheckCircle2 size={20} />, label: 'Aceitas',   value: d.acceptedProps, color: 'text-green-600',  bg: 'bg-green-50' },
              { icon: <XCircle size={20} />,      label: 'Recusadas', value: d.rejectedProps, color: 'text-slate-400',  bg: 'bg-slate-50' },
            ].map(({ icon, label, value, color, bg }) => (
              <div key={label} className={cn('rounded-xl p-4 flex flex-col items-center gap-2', bg)}>
                <div className={cn(color)}>{icon}</div>
                <span className="text-2xl font-bold text-slate-900">{value}</span>
                <span className="text-xs text-slate-500">{label}</span>
              </div>
            ))}
          </div>
          <Link
            to="/dashboard/propostas-recebidas"
            className="mt-4 block text-center text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            Ver todas as propostas →
          </Link>
        </div>
      )}

      {/* Investment */}
      {d.totalInvested > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
            <DollarSign size={22} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Total investido em projetos aceitos</p>
            <p className="text-3xl font-bold text-slate-900">
              {d.totalInvested.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">soma dos valores das propostas aceitas</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {d.totalProjects === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <FolderOpen size={28} className="text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">Nenhum dado ainda</h3>
          <p className="text-sm text-slate-400 mb-6">Publique seu primeiro projeto para ver as estatísticas aqui.</p>
          <Link to="/dashboard/criar-projeto" className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">
            Criar projeto
          </Link>
        </div>
      )}

      {/* Tips */}
      {d.totalProjects > 0 && (
        <div className="bg-primary-50 border border-primary-100 rounded-2xl p-5">
          <p className="text-sm font-semibold text-primary-800 mb-2">Dicas para atrair melhores propostas</p>
          <ul className="space-y-1.5 text-sm text-primary-700">
            <li>• Descreva detalhadamente o escopo do projeto e os resultados esperados</li>
            <li>• Defina um orçamento realista para receber propostas mais qualificadas</li>
            <li>• Responda às propostas rapidamente para engajar os melhores profissionais</li>
            <li>• Adicione categorias ao projeto para que apareça nas buscas certas</li>
          </ul>
        </div>
      )}
    </div>
  )
}
