import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, key)

// ── Auth helpers ──────────────────────────────────────────────────

export async function loginPlayer(name, pin) {
  const { data, error } = await supabase
    .from('players')
    .select('id, name, character')
    .eq('name', name)
    .eq('pin', pin)
    .single()
  if (error || !data) return { error: 'Wrong name or PIN. Try again!' }
  return { player: data }
}

// ── Progress helpers ──────────────────────────────────────────────

export async function loadProgress(playerId) {
  const { data, error } = await supabase
    .from('progress')
    .select('*')
    .eq('player_id', playerId)
    .single()
  if (error) return null
  return data
}

export async function saveProgress(playerId, updates) {
  const { error } = await supabase
    .from('progress')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('player_id', playerId)
  return !error
}

export async function loadAllProgress() {
  const { data } = await supabase
    .from('progress')
    .select('*, players(name)')
  return data || []
}

// ── Realtime subscription ─────────────────────────────────────────

export function subscribeToProgress(onChange) {
  return supabase
    .channel('progress-changes')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'progress' }, onChange)
    .subscribe()
}
