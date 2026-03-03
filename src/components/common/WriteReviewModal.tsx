import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Star } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── StarPicker ───────────────────────────────────────────────

const STAR_LABELS = ['', 'Ruim', 'Regular', 'Bom', 'Ótimo', 'Excelente']

function StarPicker({
  value,
  onChange,
  label,
  required,
}: {
  value: number
  onChange: (v: number) => void
  label: string
  required?: boolean
}) {
  const [hover, setHover] = useState(0)
  const active = hover || value

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-sm text-slate-600 w-40 shrink-0">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(value === star ? 0 : star)}
            className="transition-transform hover:scale-110 active:scale-95"
          >
            <Star
              size={22}
              className={cn(
                'transition-colors',
                active >= star ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-slate-200'
              )}
            />
          </button>
        ))}
      </div>
      {value > 0 && (
        <span className="text-xs text-amber-600 font-medium">{STAR_LABELS[value]}</span>
      )}
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────

interface WriteReviewModalProps {
  projectId: string
  reviewedId: string
  reviewedName: string
  onClose: () => void
  onDone: () => void
}

export function WriteReviewModal({
  projectId,
  reviewedId,
  reviewedName,
  onClose,
  onDone,
}: WriteReviewModalProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const [rating, setRating]                 = useState(0)
  const [qualityRating, setQualityRating]   = useState(0)
  const [commRating, setCommRating]         = useState(0)
  const [punctRating, setPunctRating]       = useState(0)
  const [profRating, setProfRating]         = useState(0)
  const [comment, setComment]               = useState('')

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Não autenticado')
      if (rating === 0) throw new Error('Selecione uma nota geral')

      const payload: Record<string, unknown> = {
        reviewer_id: user.id,
        reviewed_id: reviewedId,
        project_id:  projectId,
        rating,
        comment: comment.trim() || null,
      }
      if (qualityRating > 0)   payload.quality_rating       = qualityRating
      if (commRating > 0)      payload.communication_rating  = commRating
      if (punctRating > 0)     payload.punctuality_rating    = punctRating
      if (profRating > 0)      payload.professionalism_rating = profRating

      const { error } = await supabase.from('reviews').insert(payload)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-review', projectId] })
      queryClient.invalidateQueries({ queryKey: ['professional-reviews'] })
      toast.success('Avaliação enviada!')
      onDone()
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message ?? 'Erro ao enviar avaliação'
      toast.error(msg)
    },
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900">Avaliar profissional</h2>
            <p className="text-sm text-slate-500 mt-0.5">{reviewedName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Overall rating (required) */}
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Nota geral</p>
            <StarPicker
              label="Avaliação geral"
              value={rating}
              onChange={setRating}
              required
            />
            {rating === 0 && submit.isError && (
              <p className="text-xs text-red-500 mt-2">Selecione pelo menos a nota geral.</p>
            )}
          </div>

          {/* Detailed ratings */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Notas detalhadas <span className="font-normal text-slate-400">(opcional)</span>
            </p>
            <StarPicker label="Qualidade" value={qualityRating} onChange={setQualityRating} />
            <StarPicker label="Comunicação" value={commRating} onChange={setCommRating} />
            <StarPicker label="Pontualidade" value={punctRating} onChange={setPunctRating} />
            <StarPicker label="Profissionalismo" value={profRating} onChange={setProfRating} />
          </div>

          {/* Comment */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Comentário <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Descreva sua experiência com este profissional..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
            />
            <p className="text-xs text-slate-400 text-right">{comment.length}/500</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 pt-0">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={() => submit.mutate()}
            className="flex-1"
            isLoading={submit.isPending}
            disabled={rating === 0}
          >
            <Star size={15} />
            Enviar avaliação
          </Button>
        </div>
      </div>
    </div>
  )
}
