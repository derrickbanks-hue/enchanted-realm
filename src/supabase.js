import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, key)

// ── Auth ──────────────────────────────────────────────────────────

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

// ── Progress ──────────────────────────────────────────────────────

export async function loadProgress(playerId) {
  const { data } = await supabase
    .from('progress')
    .select('*')
    .eq('player_id', playerId)
    .single()
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

// ── Realtime ──────────────────────────────────────────────────────

export function subscribeToProgress(onChange) {
  return supabase
    .channel('progress-changes')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'progress' }, onChange)
    .subscribe()
}

export function subscribeToSabotages(onChange) {
  return supabase
    .channel('sabotage-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sabotages' }, onChange)
    .subscribe()
}

// ── Sabotage ──────────────────────────────────────────────────────

export async function sendSabotage(fromCharacter, toCharacter, weapon, effect) {
  const { error } = await supabase
    .from('sabotages')
    .insert({ from_character: fromCharacter, to_character: toCharacter, weapon, effect })
  return !error
}

export async function markSabotageSeen(id) {
  await supabase.from('sabotages').update({ seen: true }).eq('id', id)
}

export async function getPendingSabotages(toCharacter) {
  const { data } = await supabase
    .from('sabotages')
    .select('*')
    .eq('to_character', toCharacter)
    .eq('seen', false)
    .order('created_at', { ascending: true })
  return data || []
}

// ── Sessions ──────────────────────────────────────────────────────

export async function startSessionDB(playerId, character) {
  const { data } = await supabase
    .from('sessions')
    .insert({ player_id: playerId, character, puzzles_solved: 0, hints_used: 0, wrong_answers: 0 })
    .select()
    .single()
  return data
}

export async function endSessionDB(sessionId, stats) {
  if (!sessionId) return
  await supabase
    .from('sessions')
    .update({ ended_at: new Date().toISOString(), ...stats })
    .eq('id', sessionId)
}

// ── Win notification ──────────────────────────────────────────────

export async function broadcastWin(winnerCharacter) {
  await supabase
    .from('progress')
    .update({ game_won_by: winnerCharacter, updated_at: new Date().toISOString() })
    .neq('character', 'parent')
}

export async function resetAllProgressDB() {
  const { data: players } = await supabase
    .from('players')
    .select('id, character')
    .neq('character', 'parent')
  if (!players) return false
  for (const p of players) {
    await supabase.from('progress').update({
      chapter: 0, puzzle: 0, score: 0, streak: 0, difficulty: 1,
      completed_chapters: [], items: [], skills: [],
      total_puzzles_solved: 0, total_hints_used: 0, total_wrong_answers: 0,
      hints_remaining: 3, weapon_used: false, puzzle_history: [],
      sabotage_received: null, game_won_by: null,
      updated_at: new Date().toISOString(),
    }).eq('player_id', p.id)
  }
  await supabase.from('sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('sabotages').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  return true
}
