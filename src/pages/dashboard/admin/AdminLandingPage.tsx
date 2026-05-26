import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Check, X, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

interface FaqItem {
  id: string
  question: string
  answer: string
  position: number
  is_active: boolean
}

const EMPTY: Omit<FaqItem, 'id' | 'position' | 'is_active'> = { question: '', answer: '' }

export function AdminLandingPage() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<FaqItem | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState(EMPTY)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin-faq'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('landing_faq')
        .select('*')
        .order('position')
      if (error) throw error
      return (data ?? []) as FaqItem[]
    },
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-faq'] })

  const saveNew = useMutation({
    mutationFn: async () => {
      if (!draft.question.trim() || !draft.answer.trim()) throw new Error('Preencha pergunta e resposta.')
      const maxPos = items.length ? Math.max(...items.map(i => i.position)) : 0
      const { error } = await supabase
        .from('landing_faq')
        .insert({ question: draft.question.trim(), answer: draft.answer.trim(), position: maxPos + 1 })
      if (error) throw error
    },
    onSuccess: () => { toast.success('Pergunta adicionada!'); setAdding(false); setDraft(EMPTY); invalidate() },
    onError: (e: Error) => toast.error(e.message),
  })

  const saveEdit = useMutation({
    mutationFn: async () => {
      if (!editing) return
      if (!editing.question.trim() || !editing.answer.trim()) throw new Error('Preencha pergunta e resposta.')
      const { error } = await supabase
        .from('landing_faq')
        .update({ question: editing.question.trim(), answer: editing.answer.trim(), updated_at: new Date().toISOString() })
        .eq('id', editing.id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Pergunta salva!'); setEditing(null); invalidate() },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggleActive = async (item: FaqItem) => {
    const { error } = await supabase
      .from('landing_faq')
      .update({ is_active: !item.is_active })
      .eq('id', item.id)
    if (error) toast.error(error.message)
    else { toast.success(item.is_active ? 'Pergunta ocultada.' : 'Pergunta exibida.'); invalidate() }
  }

  const remove = async (id: string) => {
    if (!confirm('Excluir esta pergunta?')) return
    const { error } = await supabase.from('landing_faq').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Excluída.'); invalidate() }
  }

  const move = async (item: FaqItem, dir: 'up' | 'down') => {
    const idx = items.findIndex(i => i.id === item.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= items.length) return
    const swap = items[swapIdx]
    await Promise.all([
      supabase.from('landing_faq').update({ position: swap.position }).eq('id', item.id),
      supabase.from('landing_faq').update({ position: item.position }).eq('id', swap.id),
    ])
    invalidate()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Perguntas Frequentes</h1>
          <p className="text-slate-500 text-sm mt-1">Edite o FAQ exibido na página inicial</p>
        </div>
        <Button onClick={() => { setAdding(true); setDraft(EMPTY) }} className="gap-2">
          <Plus size={16} /> Nova pergunta
        </Button>
      </div>

      {/* Formulário novo */}
      {adding && (
        <div className="bg-white rounded-2xl border border-primary-200 p-5 space-y-3">
          <p className="font-semibold text-slate-800 text-sm">Nova pergunta</p>
          <input
            autoFocus
            placeholder="Pergunta"
            value={draft.question}
            onChange={e => setDraft(d => ({ ...d, question: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
          <textarea
            placeholder="Resposta"
            rows={4}
            value={draft.answer}
            onChange={e => setDraft(d => ({ ...d, answer: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setAdding(false)}><X size={15} /> Cancelar</Button>
            <Button onClick={() => saveNew.mutate()} isLoading={saveNew.isPending}><Check size={15} /> Salvar</Button>
          </div>
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border p-5 space-y-3 transition-opacity ${item.is_active ? 'border-slate-200' : 'border-slate-200 opacity-50'}`}
            >
              {editing?.id === item.id ? (
                <>
                  <input
                    autoFocus
                    value={editing.question}
                    onChange={e => setEditing(ed => ed ? { ...ed, question: e.target.value } : ed)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-300"
                  />
                  <textarea
                    rows={4}
                    value={editing.answer}
                    onChange={e => setEditing(ed => ed ? { ...ed, answer: e.target.value } : ed)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setEditing(null)}><X size={15} /> Cancelar</Button>
                    <Button onClick={() => saveEdit.mutate()} isLoading={saveEdit.isPending}><Check size={15} /> Salvar</Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-slate-900 text-sm flex-1">{item.question}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => move(item, 'up')} disabled={idx === 0} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                        <ChevronUp size={15} />
                      </button>
                      <button onClick={() => move(item, 'down')} disabled={idx === items.length - 1} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                        <ChevronDown size={15} />
                      </button>
                      <button onClick={() => toggleActive(item)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" title={item.is_active ? 'Ocultar' : 'Exibir'}>
                        {item.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                      </button>
                      <button onClick={() => setEditing(item)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => remove(item.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.answer}</p>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {!isLoading && items.length === 0 && !adding && (
        <p className="text-center text-slate-400 py-12 border border-dashed border-slate-200 rounded-2xl text-sm">
          Nenhuma pergunta cadastrada. Clique em "Nova pergunta" para começar.
        </p>
      )}
    </div>
  )
}
