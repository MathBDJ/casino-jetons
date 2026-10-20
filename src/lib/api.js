import { supabase } from './supabase'

// Appelle la fonction serveur. Si tu la renommes un jour, change le nom ici.
export async function appelerFonction(body) {
  const { data, error } = await supabase.functions.invoke('clever-responder', { body })
  if (error) {
    let msg = error.message
    try {
      const j = await error.context.json()
      if (j?.error) msg = j.error
    } catch {
      /* on garde le message par défaut */
    }
    return { error: msg }
  }
  if (data?.error) return { error: data.error }
  return { data }
}