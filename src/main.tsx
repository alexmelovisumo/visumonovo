import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { App } from '@/App'
import { queryClient } from '@/lib/queryClient'
import { useAuthStore } from '@/stores/authStore'
import '@/index.css'

// Initialize auth before render (listen for session)
useAuthStore.getState().initialize()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        richColors
        position="top-right"
        expand={false}
        duration={4000}
      />
    </QueryClientProvider>
  </StrictMode>,
)
