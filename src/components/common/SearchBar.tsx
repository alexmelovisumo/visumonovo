import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, FolderOpen, Users, Package, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// ─── Result types ─────────────────────────────────────────────

type ResultItem =
  | { kind: 'project';      id: string; label: string; sub: string }
  | { kind: 'professional'; id: string; label: string; sub: string }
  | { kind: 'product';      id: string; label: string; sub: string }

// ─── Search fn ───────────────────────────────────────────────

async function globalSearch(q: string): Promise<ResultItem[]> {
  const term = `%${q}%`
  const results: ResultItem[] = []

  const [projects, professionals, products] = await Promise.all([
    supabase
      .from('projects')
      .select('id, title, city, state')
      .ilike('title', term)
      .eq('status', 'open')
      .limit(4),

    supabase
      .from('profiles')
      .select('id, full_name, email, city, state, user_type')
      .or(`full_name.ilike.${term},bio.ilike.${term}`)
      .in('user_type', ['profissional', 'empresa_prestadora'])
      .eq('is_active', true)
      .limit(4),

    supabase
      .from('products')
      .select('id, title, category')
      .ilike('title', term)
      .eq('is_active', true)
      .limit(4),
  ])

  for (const p of projects.data ?? []) {
    results.push({
      kind: 'project',
      id:    p.id,
      label: p.title,
      sub:   [p.city, p.state].filter(Boolean).join('/') || 'Projeto aberto',
    })
  }
  for (const p of professionals.data ?? []) {
    results.push({
      kind: 'professional',
      id:    p.id,
      label: p.full_name ?? p.email,
      sub:   [p.city, p.state].filter(Boolean).join('/') || 'Profissional',
    })
  }
  for (const p of products.data ?? []) {
    results.push({
      kind: 'product',
      id:    p.id,
      label: p.title,
      sub:   p.category ?? 'Produto',
    })
  }

  return results
}

// ─── Icon per kind ────────────────────────────────────────────

function KindIcon({ kind }: { kind: ResultItem['kind'] }) {
  const cls = 'shrink-0 rounded-md p-1'
  if (kind === 'project')      return <div className={cn(cls, 'bg-primary-50 text-primary-600')}><FolderOpen size={14} /></div>
  if (kind === 'professional') return <div className={cn(cls, 'bg-green-50 text-green-600')}><Users size={14} /></div>
  return                              <div className={cn(cls, 'bg-amber-50 text-amber-600')}><Package size={14} /></div>
}

const KIND_LABEL: Record<ResultItem['kind'], string> = {
  project:      'Projeto',
  professional: 'Profissional',
  product:      'Produto',
}

// ─── Component ───────────────────────────────────────────────

export function SearchBar() {
  const [query, setQuery]       = useState('')
  const [open, setOpen]         = useState(false)
  const [active, setActive]     = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const trimmed = query.trim()

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['global-search', trimmed],
    queryFn: () => globalSearch(trimmed),
    enabled: trimmed.length >= 2,
    staleTime: 10_000,
  })

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Reset active on new results
  useEffect(() => { setActive(-1) }, [results])

  const goTo = (item: ResultItem) => {
    if (item.kind === 'project')      navigate(`/dashboard/projeto/${item.id}`)
    if (item.kind === 'professional') navigate(`/dashboard/profissional/${item.id}`)
    if (item.kind === 'product')      navigate(`/dashboard/fornecedores`)
    setQuery('')
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    if (e.key === 'Enter' && active >= 0) { e.preventDefault(); goTo(results[active]) }
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
  }

  const showDropdown = open && trimmed.length >= 2

  return (
    <div ref={containerRef} className="relative hidden md:block w-64 lg:w-80">
      {/* Input */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar projetos, profissionais..."
          className={cn(
            'w-full rounded-lg border bg-slate-50 pl-9 pr-3 py-2 text-sm text-slate-800',
            'placeholder:text-slate-400 focus:bg-white focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/20 transition-all'
          )}
        />
        {isFetching && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
          {results.length === 0 && !isFetching ? (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              Nenhum resultado para "{trimmed}"
            </div>
          ) : (
            <ul>
              {results.map((item, i) => (
                <li key={`${item.kind}-${item.id}`}>
                  <button
                    onClick={() => goTo(item)}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      i === active ? 'bg-primary-50' : 'hover:bg-slate-50'
                    )}
                  >
                    <KindIcon kind={item.kind} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.label}</p>
                      <p className="text-xs text-slate-400 truncate">{item.sub}</p>
                    </div>
                    <span className="text-[10px] font-medium text-slate-300 shrink-0">
                      {KIND_LABEL[item.kind]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Footer hint */}
          <div className="border-t border-slate-100 px-4 py-2 flex items-center gap-3 bg-slate-50">
            <span className="text-[10px] text-slate-400">↑↓ navegar</span>
            <span className="text-[10px] text-slate-400">Enter selecionar</span>
            <span className="text-[10px] text-slate-400">Esc fechar</span>
          </div>
        </div>
      )}
    </div>
  )
}
