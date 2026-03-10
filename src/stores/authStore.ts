import { create } from 'zustand'
import type { User, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

// ─── State Interface ─────────────────────────────────────────

interface AuthState {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isInitialized: boolean

  // Actions
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  fetchProfile: (userId: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<{ userId: string }>
  signOut: () => Promise<void>
  initialize: () => Promise<() => void>
}

// ─── Store ────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isInitialized: false,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),

  fetchProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!error && data) {
      set({ profile: data })
      return
    }

    // Profile row missing (trigger race or failure) — create it from auth metadata
    if (error?.code === 'PGRST116') {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const meta = user.user_metadata ?? {}
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: user.email ?? '',
            user_type: meta.user_type ?? 'empresa',
            full_name: meta.full_name ?? null,
            phone: meta.phone ?? null,
            city: meta.city ?? null,
            state: meta.state ?? null,
            company_name: meta.company_name ?? null,
          })
          .select('*')
          .single()
        if (newProfile) set({ profile: newProfile })
      }
    }
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data.user) {
      set({ user: data.user })
      await get().fetchProfile(data.user.id)
    }
  },

  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error as AuthError
    if (!data.user) throw new Error('Erro ao criar conta. Tente novamente.')
    set({ user: data.user })
    return { userId: data.user.id }
  },

  signOut: async () => {
    await supabase.auth.signOut()   // must await — clears localStorage before navigation
    set({ user: null, profile: null })
  },

  initialize: async () => {
    set({ isLoading: true })

    // Get current session
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      set({ user: session.user })
      await get().fetchProfile(session.user.id)
    }

    set({ isLoading: false, isInitialized: true })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          set({ user: session.user })
          await get().fetchProfile(session.user.id)
        }
        if (event === 'SIGNED_OUT') {
          set({ user: null, profile: null })
        }
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          set({ user: session.user })
        }
      }
    )

    // Return cleanup function
    return () => subscription.unsubscribe()
  },
}))

// ─── Selectors ────────────────────────────────────────────────

export const selectUser = (s: AuthState) => s.user
export const selectProfile = (s: AuthState) => s.profile
export const selectIsAuthenticated = (s: AuthState) => !!s.user
export const selectIsLoading = (s: AuthState) => s.isLoading
export const selectUserType = (s: AuthState) => s.profile?.user_type
