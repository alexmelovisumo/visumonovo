import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFavorites, type FavoriteEntityType } from '@/hooks/useFavorites'
import { useAuthStore } from '@/stores/authStore'

interface FavoriteButtonProps {
  entityType: FavoriteEntityType
  entityId: string
  size?: number
  className?: string
}

export function FavoriteButton({ entityType, entityId, size = 16, className }: FavoriteButtonProps) {
  const { user } = useAuthStore()
  const { isFavorite, toggle } = useFavorites()

  if (!user) return null

  const active = isFavorite(entityType, entityId)

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggle.mutate({ entityType, entityId })
      }}
      disabled={toggle.isPending}
      title={active ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
      className={cn(
        'flex items-center justify-center rounded-full p-1.5 transition-all',
        active
          ? 'text-rose-500 bg-rose-50 hover:bg-rose-100'
          : 'text-slate-300 hover:text-rose-400 hover:bg-rose-50',
        'disabled:opacity-50',
        className
      )}
    >
      <Heart
        size={size}
        className={cn('transition-all', active && 'fill-rose-500')}
      />
    </button>
  )
}
