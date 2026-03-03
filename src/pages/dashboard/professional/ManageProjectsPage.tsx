import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Briefcase, MapPin, Calendar, DollarSign, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import type { Proposal, Project } from '@/types'

// ─── Card ─────────────────────────────────────────────────────

function ActiveProjectCard({ proposal }: { proposal: Proposal & { project: Project } }) {
  const p = proposal.project
  return (
    <div className="bg-white rounded-2xl border border-green-200 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 mb-2 inline-block">
            Proposta aceita
          </span>
          <h3 className="font-semibold text-slate-900 text-sm leading-snug">{p.title}</h3>
        </div>
      </div>

      <p className="text-xs text-slate-500 line-clamp-2">{p.description}</p>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {p.city && (
          <span className="flex items-center gap-1">
            <MapPin size={11} /> {p.city}/{p.state}
          </span>
        )}
        {p.deadline && (
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            Prazo: {format(new Date(p.deadline), 'dd/MM/yyyy', { locale: ptBR })}
          </span>
        )}
        <span className="flex items-center gap-1 font-semibold text-slate-700">
          <DollarSign size={11} />
          {proposal.proposed_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
        <span className="flex items-center gap-1">
          <Calendar size={11} /> {proposal.estimated_days} dias estimados
        </span>
      </div>

      <Link to={`/dashboard/projeto/${p.id}`}>
        <Button variant="outline" size="sm" className="w-full">
          Ver projeto <ArrowRight size={14} />
        </Button>
      </Link>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function ManageProjectsPage() {
  const { user } = useAuthStore()

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['accepted-proposals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposals')
        .select('*, project:projects(*)')
        .eq('professional_id', user!.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as (Proposal & { project: Project })[]
    },
    enabled: !!user?.id,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Projetos em andamento</h1>
        <p className="text-slate-500 text-sm mt-1">
          {proposals.length} projeto{proposals.length !== 1 ? 's' : ''} com proposta aceita
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : proposals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Briefcase size={28} className="text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">Nenhum projeto ativo ainda</h3>
          <p className="text-sm text-slate-400 mb-6">
            Quando uma empresa aceitar sua proposta, o projeto aparecerá aqui.
          </p>
          <Link to="/dashboard/projetos">
            <Button>Buscar projetos</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {proposals.map((p) => (
            <ActiveProjectCard key={p.id} proposal={p} />
          ))}
        </div>
      )}
    </div>
  )
}
