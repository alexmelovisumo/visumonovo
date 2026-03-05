import { supabase } from './supabase'

type EmailType =
  | 'nova_proposta'
  | 'proposta_aceita'
  | 'proposta_recusada'
  | 'projeto_finalizado'
  | 'cotacao_respondida'

/**
 * Fire-and-forget email notification via Edge Function.
 * Never throws — email is non-critical to the user flow.
 */
export async function notifyEmail(
  type: EmailType,
  payload: { proposalId?: string; projectId?: string; quoteRequestId?: string },
) {
  try {
    await supabase.functions.invoke('send-email', {
      body: { type, ...payload },
    })
  } catch {
    // silent — email failure must never block the UI
  }
}
