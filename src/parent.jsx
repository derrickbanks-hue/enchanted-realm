import React, { useState, useEffect } from 'react'
import { supabase } from './supabase.js'

const CHARACTERS = {
  charlotte: { name: 'Charlotte', color: '#38bdf8', avatar: '/charlotte.png' },
  rileigh:   { name: 'Rileigh',   color: '#a78bfa', avatar: '/rileigh.png'   },
  margaux:   { name: 'Margaux',   color: '#fbbf24', avatar: '/margaux.png'   },
}

const CHAPTERS = 5
const PUZZLES_PER_CHAPTER = 5

async function loginParent(pin) {
  const { data, error } = await supabase
    .from('players')
    .select('id, name, character')
    .eq('name', 'Parent')
    .eq('pin', pin)
    .single()
  if (error || !data) return { error: 'Wrong PIN. Try again!' }
  return { player: data }
}

async function loadDashboardData() {
  const [progressRes, sessionsRes, playersRes] = await Promise.all([
    supabase.from('progress').select('*, players(name)'),
    supabase.from('sessions').select('*, players(name)').order('started_at', { ascending: false }),
    supabase.from('players').select('*').neq('character', 'parent'),
  ])
  return {
    progress: progressRes.data || [],
    sessions: sessionsRes.data || [],
    players: playersRes.data || [],
  }
}

async function resetAllProgress() {
  const { data: players } = await supabase.from('players').select('id, character').neq('character', 'parent')
  if (!players) return false
  for (const p of players) {
    await supabase.from('progress').update({
      chapter: 0, puzzle: 0, score: 0, streak: 0, difficulty: 1,
      completed_chapters: [], items: [], skills: [],
      total_puzzles_solved: 0, total_hints_used: 0, total_wrong_answers: 0,
      updated_at: new Date().toISOString(),
    }).eq('player_id', p.id)
  }
  await supabase.from('sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  return true
}

async function resetPlayerProgress(playerId) {
  await supabase.from('progress').update({
    chapter: 0, puzzle: 0, score: 0, streak: 0, difficulty: 1,
    completed_chapters: [], items: [], skills: [],
    total_puzzles_solved: 0, total_hints_used: 0, total_wrong_answers: 0,
    updated_at: new Date().toISOString(),
  }).eq('player_id', playerId)
  await supabase.from('sessions').delete().eq('player_id', playerId)
}

const st = {
  bg: { minHeight: '100vh', background: 'linear-gradient(135deg,#0a0820,#1a0f3a,#0d0618)', padding: '1.5rem 1rem', fontFamily: 'system-ui,sans-serif', color: '#fff' },
  card: { background: 'rgba(255,255,255,0.06)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', padding: '1.25rem', marginBottom: '1rem' },
  btn: (col) => ({ background: col, border: 'none', borderRadius: 10, padding: '0.6rem 1.2rem', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }),
  dangerBtn: { background: '#dc2626', border: 'none', borderRadius: 10, padding: '0.6rem 1.2rem', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  label: { fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, display: 'block' },
  stat: { background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '0.75rem', flex: 1, textAlign: 'center' },
}

function PinLogin({ onLogin }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (pin.length < 4) return
    setLoading(true); setError('')
    const { player, error: err } = await loginParent(pin)
    if (err) { setError(err); setLoading(false); return }
    onLogin(player)
    setLoading(false)
  }

  return (
    <div style={{ ...st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...st.card, maxWidth: 340, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>👨‍👩‍👧‍👧</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>Parent Dashboard</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: '1.5rem' }}>Enter your PIN to continue</p>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', padding: '0.75rem', textAlign: 'center', fontSize: 28, letterSpacing: 12, marginBottom: 12, minHeight: 52 }}>
          {'●'.repeat(pin.length)}{'○'.repeat(Math.max(0, 4 - pin.length))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} onClick={() => pin.length < 4 && setPin(p => p + n)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '0.85rem', fontSize: 20, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>{n}</button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: '1rem' }}>
          <div/>
          <button onClick={() => pin.length < 4 && setPin(p => p + '0')} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '0.85rem', fontSize: 20, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>0</button>
          <button onClick={() => setPin(p => p.slice(0, -1))} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '0.85rem', fontSize: 20, color: '#fff', cursor: 'pointer' }}>⌫</button>
        </div>
        {error && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 10 }}>{error}</p>}
        <button onClick={handleLogin} disabled={pin.length < 4 || loading} style={{ ...st.btn('#7c3aed'), width: '100%', fontSize: 15, padding: '0.85rem', opacity: pin.length === 4 ? 1 : 0.4 }}>
          {loading ? 'Checking...' : 'Enter Dashboard'}
        </button>
        <a href="/" style={{ display: 'block', marginTop: 16, color: 'rgba(255,255,255,0.3)', fontSize: 12, textDecoration: 'none' }}>← Back to game</a>
      </div>
    </div>
  )
}

export default function Parent() {
  const [authed, setAuthed] = useState(false)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [resetMsg, setResetMsg] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState(null)

  async function load() {
    setLoading(true)
    const d = await loadDashboardData()
    setData(d)
    setLoading(false)
  }

  useEffect(() => { if (authed) load() }, [authed])

  async function handleResetAll() {
    if (!window.confirm('Reset ALL progress for all 3 girls? This cannot be undone.')) return
    await resetAllProgress()
    setResetMsg('All progress has been reset.')
    load()
  }

  async function handleResetPlayer(playerId, name) {
    if (!window.confirm(`Reset all progress for ${name}? This cannot be undone.`)) return
    await resetPlayerProgress(playerId)
    setResetMsg(`${name}'s progress has been reset.`)
    load()
  }

  if (!authed) return <PinLogin onLogin={() => setAuthed(true)}/>

  const chars = ['charlotte', 'rileigh', 'margaux']

  return (
    <div style={st.bg}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>👨‍👩‍👧‍👧 Parent Dashboard</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 3 }}>The Enchanted Realm — Sisters of Magic</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={load} style={st.btn('#334155')}>↻ Refresh</button>
            <a href="/" style={{ ...st.btn('#1e3a8a'), textDecoration: 'none', display: 'inline-block' }}>← Game</a>
          </div>
        </div>

        {resetMsg && (
          <div style={{ background: '#16a34a22', border: '1px solid #16a34a', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: 13, color: '#4ade80' }}>
            ✓ {resetMsg}
          </div>
        )}

        {loading && <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '2rem' }}>Loading data...</p>}

        {data && (
          <>
            {/* ── Overview cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: '1rem' }}>
              {chars.map(name => {
                const ch = CHARACTERS[name]
                const prog = data.progress.find(p => p.character === name)
                const player = data.players.find(p => p.character === name)
                if (!prog || !player) return null
                const totalPuzzles = PUZZLES_PER_CHAPTER * CHAPTERS
                const done = (prog.completed_chapters.length * PUZZLES_PER_CHAPTER) + prog.puzzle
                const pct = Math.round((done / totalPuzzles) * 100)
                const playerSessions = data.sessions.filter(s => s.player_id === player.id)
                const totalTime = playerSessions.reduce((acc, s) => {
                  if (!s.ended_at) return acc
                  return acc + (new Date(s.ended_at) - new Date(s.started_at))
                }, 0)
                const mins = Math.round(totalTime / 60000)

                return (
                  <div key={name} style={{ ...st.card, borderColor: `${ch.color}44`, marginBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <img src={ch.avatar} alt={ch.name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', objectPosition: 'top', border: `1.5px solid ${ch.color}55` }}/>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{ch.name}</div>
                        <div style={{ fontSize: 11, color: ch.color }}>{prog.score.toLocaleString()} pts</div>
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 5, overflow: 'hidden', marginBottom: 10 }}>
                      <div style={{ background: ch.color, width: `${pct}%`, height: '100%', borderRadius: 4 }}/>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                      {[
                        ['Chapter', `${prog.completed_chapters.length}/${CHAPTERS}`],
                        ['Progress', `${pct}%`],
                        ['Solved', prog.total_puzzles_solved || done],
                        ['Time', `${mins}m`],
                        ['Hints', prog.total_hints_used || 0],
                        ['Misses', prog.total_wrong_answers || 0],
                      ].map(([label, val]) => (
                        <div key={label} style={st.stat}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: ch.color }}>{val}</div>
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => handleResetPlayer(player.id, ch.name)} style={{ ...st.dangerBtn, width: '100%', fontSize: 11, padding: '0.45rem' }}>
                      Reset {ch.name}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* ── Session history ── */}
            <div style={st.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1 }}>Recent Sessions</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Last 20</span>
              </div>
              {data.sessions.slice(0, 20).length === 0 && (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No sessions recorded yet.</p>
              )}
              {data.sessions.slice(0, 20).map(s => {
                const ch = CHARACTERS[s.character]
                if (!ch) return null
                const dur = s.ended_at ? Math.round((new Date(s.ended_at) - new Date(s.started_at)) / 60000) : null
                const date = new Date(s.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <img src={ch.avatar} alt={ch.name} style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', objectPosition: 'top' }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: ch.color }}>{ch.name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{date}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                      <div>✅ {s.puzzles_solved} solved</div>
                      <div>💡 {s.hints_used} hints · ❌ {s.wrong_answers} wrong</div>
                      {dur !== null && <div>⏱ {dur} min</div>}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Chapter completion timeline ── */}
            <div style={st.card}>
              <span style={{ ...st.label, fontSize: 12 }}>Chapter Completion Timeline</span>
              {chars.map(name => {
                const ch = CHARACTERS[name]
                const prog = data.progress.find(p => p.character === name)
                if (!prog) return null
                return (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <img src={ch.avatar} alt={ch.name} style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', objectPosition: 'top' }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {Array.from({ length: CHAPTERS }).map((_, i) => {
                          const done = prog.completed_chapters.includes(i)
                          return (
                            <div key={i} style={{ flex: 1, height: 20, borderRadius: 4, background: done ? ch.color : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: done ? '#fff' : 'rgba(255,255,255,0.2)' }}>
                              {done ? '✓' : i + 1}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', minWidth: 40, textAlign: 'right' }}>{prog.completed_chapters.length}/{CHAPTERS}</span>
                  </div>
                )
              })}
            </div>

            {/* ── Reset all ── */}
            <div style={{ ...st.card, borderColor: '#dc262644', background: '#dc262608' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Danger Zone</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Reset All Progress</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Clears all chapters, scores and sessions for all 3 girls</div>
                </div>
                <button onClick={handleResetAll} style={{ ...st.dangerBtn, whiteSpace: 'nowrap' }}>
                  🗑 Reset All
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
