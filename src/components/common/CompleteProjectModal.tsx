import { useState, useRef } from 'react'
import { X, Star, Check, Upload, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

interface Props {
  projectId: string
  professionalId: string
  professionalName: string
  onClose: () => void
  onComplete: () => void
}

export function CompleteProjectModal({
  projectId,
  professionalId,
  professionalName,
  onClose,
  onComplete,
}: Props) {
  const [rating, setRating]         = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment]       = useState('')
  const [finalPrice, setFinalPrice] = useState('')
  const [notes, setNotes]           = useState('')
  const [images, setImages]         = useState<File[]>([])
  const [uploading, setUploading]   = useState(false)
  const [loading, setLoading]       = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // ─── Image selection ─────────────────────────────────────

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    const valid: File[] = []
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name} é muito grande (máx. 10 MB)`); continue }
      valid.push(f)
    }
    setImages((prev) => [...prev, ...valid])
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ─── Submit ──────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) { toast.error('Selecione uma avaliação'); return }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      // 1. Registrar conclusão
      const { error: compErr } = await supabase.from('project_completions').insert({
        project_id:      projectId,
        professional_id: professionalId,
        company_id:      user.id,
        final_price:     finalPrice ? parseFloat(finalPrice) : null,
        notes:           notes || null,
      })
      if (compErr) throw compErr

      // 2. Avaliação
      const { error: revErr } = await supabase.from('reviews').insert({
        reviewer_id: user.id,
        reviewed_id: professionalId,
        project_id:  projectId,
        rating,
        comment:     comment || null,
      })
      if (revErr && !revErr.message.includes('unique')) throw revErr

      // 3. Upload de fotos
      for (const img of images) {
        const ext      = img.name.split('.').pop()
        const filePath = `${projectId}/${user.id}-${Date.now()}.${ext}`

        const { error: upErr } = await supabase.storage
          .from('project-attachments')
          .upload(filePath, img)

        if (upErr) { console.error('Upload falhou:', upErr); continue }

        const { data: { publicUrl } } = supabase.storage
          .from('project-attachments')
          .getPublicUrl(filePath)

        await supabase.from('project_attachments').insert({
          project_id:  projectId,
          uploaded_by: user.id,
          file_url:    publicUrl,
          file_name:   img.name,
          file_type:   img.type,
          file_size:   img.size,
          category:    'photo',
          caption:     'Foto de conclusão',
        })
      }

      // 4. Atualizar status do projeto
      await supabase.from('projects').update({ status: 'completed' }).eq('id', projectId)

      toast.success('Projeto concluído com sucesso!')
      onComplete()
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Erro ao finalizar projeto'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const LABELS = ['', 'Muito insatisfeito', 'Insatisfeito', 'Satisfeito', 'Muito satisfeito', 'Excelente!']

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Finalizar Projeto</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Rating */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Avalie {professionalName}
            </label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={40}
                    className={
                      (hoverRating || rating) >= s
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-200'
                    }
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-slate-500 mt-2">{LABELS[rating]}</p>
            )}
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Comentário <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
              placeholder="Como foi trabalhar com este profissional?"
            />
          </div>

          {/* Final price */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Valor final do projeto <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              type="number"
              value={finalPrice}
              onChange={(e) => setFinalPrice(e.target.value)}
              step="0.01"
              min="0"
              placeholder="0,00"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Observações finais <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
              placeholder="Alguma observação sobre a entrega?"
            />
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Fotos de conclusão <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full px-4 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Upload size={16} />
              {uploading ? 'Processando...' : 'Adicionar fotos'}
            </button>
            {images.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {images.map((img, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={URL.createObjectURL(img)}
                      alt=""
                      className="w-full h-24 object-cover rounded-xl border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || rating === 0}
              className="flex-1 bg-green-600 hover:bg-green-700"
              isLoading={loading}
            >
              <Check size={16} />
              Finalizar Projeto
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
