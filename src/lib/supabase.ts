import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(url && key)

export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true },
})

/** Estrae un messaggio leggibile dagli errori di Supabase/PostgREST. */
export function errorMessage(error: unknown): string {
  if (!error) return 'Errore sconosciuto'
  if (typeof error === 'string') return error
  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    const msg = error.message
    if ('code' in error && error.code === '23503') return 'Elemento ancora in uso: archivialo invece di eliminarlo.'
    if ('code' in error && error.code === '23505') return 'Esiste già un elemento con questo nome.'
    if ('code' in error && error.code === '42501') return msg.includes('row-level security') ? 'Permessi insufficienti.' : msg
    if (msg === 'Invalid login credentials') return 'Email o password non corretti.'
    return msg
  }
  return 'Errore sconosciuto'
}

/** Lancia l'errore di una risposta Supabase, altrimenti restituisce i dati. */
export function unwrap<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error
  return res.data
}
