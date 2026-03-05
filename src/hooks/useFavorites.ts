import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export type FavoriteEntityType = 'professional' | 'project' | 'supplier'

interface Favorite {
  id: string
  entity_type: FavoriteEntityType
  entity_id: string
  created_at: string
}

export function useFavorites() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('id, entity_type, entity_id, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Favorite[]
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  })

  const toggle = useMutation({
    mutationFn: async ({ entityType, entityId }: { entityType: FavoriteEntityType; entityId: string }) => {
      const existing = favorites.find(
        (f) => f.entity_type === entityType && f.entity_id === entityId
      )
      if (existing) {
        const { error } = await supabase.from('favorites').delete().eq('id', existing.id)
        if (error) throw error
        return 'removed'
      } else {
        const { error } = await supabase.from('favorites').insert({
          user_id: user!.id,
          entity_type: entityType,
          entity_id: entityId,
        })
        if (error) throw error
        return 'added'
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] })
    },
  })

  const isFavorite = (entityType: FavoriteEntityType, entityId: string) =>
    favorites.some((f) => f.entity_type === entityType && f.entity_id === entityId)

  const favoriteIds = (entityType: FavoriteEntityType) =>
    favorites.filter((f) => f.entity_type === entityType).map((f) => f.entity_id)

  return { favorites, isFavorite, toggle, favoriteIds }
}
