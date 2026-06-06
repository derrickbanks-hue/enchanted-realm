import React, { useState, useEffect, useRef } from 'react'
import { loginPlayer, loadProgress, saveProgress, loadAllProgress, subscribeToProgress } from './supabase.js'
import { playCorrect, playWrong, playClick, playLevelUp, playChapterComplete, playConfetti, startMusic, stopMusic, setMuted, isMuted } from './sounds.js'

const AVATARS = { charlotte: '/charlotte.png', rileigh: '/rileigh.png', margaux: '/margaux.png' }

const CHARACTERS = {
  charlotte: { name: 'Charlotte', age: 7, power: 'Heart Magic', color: '#38bdf8', avatar: '🌀', weapon: ['Wand of Hearts','Crystal Staff','Rainbow Scepter','Moonbeam Rod','Star Prism'], skill: ['Healing Touch','Petal Shield','Glow Aura','Spirit Song','Heartfire Burst'], puzzleStyle: 'age 7 child, use simple concepts: colors, counting to 20, short riddles, basic patterns, matching. Always 4 short answer choices.' },
  rileigh:   { name: 'Rileigh',   age: 13, power: 'Star Magic',  color: '#a78bfa', avatar: '🌟', weapon: ['Starlight Wand','Celestial Staff','Nova Lance','Comet Blade','Eclipse Sword'], skill: ['Star Map','Gravity Pull','Void Step','Constellation Lock','Supernova Strike'], puzzleStyle: 'age 13 advanced student, use logic deduction, word puzzles, number sequences with tricky gaps, multi-step reasoning, vocabulary. Always 4 answer choices.' },
  margaux:   { name: 'Margaux',   age: 9,  power: 'Storm Magic', color: '#fbbf24', avatar: '⚡', weapon: ['Thunder Wand','Storm Trident','Lightning Blade','Tempest Bow','Cyclone Gauntlet'], skill: ['Wind Dash','Thunder Clap','Storm Eye','Gale Force','Hurricane Fury'], puzzleStyle: 'age 9 sharp student, use memory challenges, arithmetic, pattern sequences, riddles, quick logic. Always 4 answer choices.' },
}

const CHAPTERS = [
  { title: 'The Whispering Forest',   icon: '🌲', theme: 'an enchanted forest full of talking animals and ancient glowing trees',         bg: ['#061a0e','#0d3320','#071410'], accent: '#22c55e' },
  { title: 'The Crystal Caves',       icon: '💎', theme: 'glittering underground caves filled with magical gems and echoing riddles',       bg: ['#08061f','#180d45','#05030f'], accent: '#818cf8' },
  { title: 'The Sky Kingdom',         icon: '☁️', theme: 'a floating kingdom above the clouds ruled by wind spirits',                       bg: ['#030f1f','#072444','#020810'], accent: '#38bdf8' },
  { title: 'The Sunken Temple',       icon: '🏛️', theme: 'an ancient underwater temple with glowing runes and sea creatures',               bg: ['#031218','#052e3e','#020c10'], accent: '#06b6d4' },
  { title: "The Shadow Queen's Lair", icon: '🌑', theme: 'the dark fortress of the Shadow Queen, the final challenge',                      bg: ['#0a0212','#1a052e','#050008'], accent: '#c084fc' },
]

const PUZZLE_TYPES = {
  charlotte: ['color or shape matching','simple counting or addition','short fun riddle','finish the pattern','spot the odd one out'],
  rileigh:   ['logic deduction puzzle','number sequence with explanation','challenging word riddle','multi-step math problem','vocabulary or synonym/antonym puzzle'],
  margaux:   ['memory or recall challenge','multiplication or division problem','medium riddle','number pattern sequence','spatial or ordering logic puzzle'],
}

const TOTAL_PUZZLES = 5 * 5

// ── Confetti component ────────────────────────────────────────────
function Confetti() {
  const colors = ['#38bdf8','#a78bfa','#fbbf24','#f472b6','#4ade80','#fb923c']
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: Math.random() * 100,
    delay: Math.random() * 2,
    dur: 2.5 + Math.random() * 2,
    size: 6 + Math.random() * 8,
    rotate: Math.random() * 360,
  }))
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 100, overflow: 'hidden' }}>
      <style>{`
        @keyframes fall { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }
      `}</style>
      {pieces.map(p => (
        <div key={p.id} style={{ position: 'absolute', left: `${p.left}%`, top: -20, width: p.size, height: p.size, background: p.color, borderRadius: p.id % 3 === 0 ? '50%' : 2, animation: `fall ${p.dur}s ${p.delay}s ease-in forwards` }}/>
      ))}
    </div>
  )
}

// ── Winner podium screen ──────────────────────────────────────────
function WinnerScreen({ allProgress, winner, onClose }) {
  const [showPodium, setShowPodium] = useState(false)
  useEffect(() => {
    playConfetti()
    const t = setTimeout(() => setShowPodium(true), 3500)
    return () => clearTimeout(t)
  }, [])

  const sorted = [...allProgress]
    .filter(r => r.character !== 'parent')
    .sort((a, b) => {
      const aDone = a.completed_chapters?.length === 5
      const bDone = b.completed_chapters?.length === 5
      if (aDone && !bDone) return -1
      if (!aDone && bDone) return 1
      return b.score - a.score
    })

  const medals = ['🥇','🥈','🥉']
  const podiumHeights = [180, 130, 100]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 99, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <Confetti/>
      {!showPodium ? (
        <div style={{ textAlign: 'center', zIndex: 101 }}>
          <div style={{ fontSize: 72, marginBottom: 16, animation: 'none' }}>🏆</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px', background: 'linear-gradient(90deg,#fbbf24,#f472b6,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {CHARACTERS[winner?.character]?.name} Wins!
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>She completed the Enchanted Realm first! 🎉</p>
          <img src={AVATARS[winner?.character]} alt="" style={{ width: 140, height: 180, objectFit: 'cover', objectPosition: 'top', borderRadius: 16, marginTop: 16, border: `3px solid ${CHARACTERS[winner?.character]?.color}` }}/>
        </div>
      ) : (
        <div style={{ textAlign: 'center', zIndex: 101, width: '100%', maxWidth: 500 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: '1.5rem' }}>🏆 Final Standings</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 12, marginBottom: '1.5rem' }}>
            {[sorted[1], sorted[0], sorted[2]].map((r, podiumPos) => {
              if (!r) return <div key={podiumPos} style={{ width: 120 }}/>
              const rank = sorted.indexOf(r)
              const ch = CHARACTERS[r.character]
              const pct = Math.round(((r.completed_chapters?.length * 5 + r.puzzle) / TOTAL_PUZZLES) * 100)
              return (
                <div key={r.character} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 130 }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{medals[rank]}</div>
                  <img src={AVATARS[r.character]} alt={ch.name} style={{ width: 60, height: 76, objectFit: 'cover', objectPosition: 'top', borderRadius: 10, border: `2px solid ${ch.color}`, marginBottom: 6 }}/>
                  <div style={{ fontWeight: 700, fontSize: 14, color: ch.color }}>{ch.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{r.score.toLocaleString()} pts</div>
                  <div style={{ background: ch.color, width: '100%', height: podiumHeights[podiumPos === 1 ? 0 : podiumPos === 0 ? 1 : 2], borderRadius: '6px 6px 0 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 8, fontSize: 18, fontWeight: 700 }}>
                    {podiumPos === 1 ? '1' : podiumPos === 0 ? '2' : '3'}
                  </div>
                </div>
              )
            })}
          </div>
          <button onClick={onClose} style={{ background: '#7c3aed', border: 'none', borderRadius: 12, padding: '0.75rem 2rem', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            Continue Playing
          </button>
        </div>
      )}
    </div>
  )
}

// ── Scene SVG ─────────────────────────────────────────────────────
function SceneSVG({ chapter, puzzleIdx, playerName }) {
  const chap = CHAPTERS[chapter] || CHAPTERS[0]
  const ch = CHARACTERS[playerName]
  const total = PUZZLE_TYPES[playerName].length
  return (
    <svg viewBox="0 0 320 110" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', borderRadius: 10 }}>
      <defs>
        <linearGradient id={`sg${chapter}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={chap.bg[0]}/><stop offset="50%" stopColor={chap.bg[1]}/><stop offset="100%" stopColor={chap.bg[0]}/></linearGradient>
        <radialGradient id={`sr${chapter}`} cx="50%" cy="50%" r="60%"><stop offset="0%" stopColor={chap.accent} stopOpacity="0.18"/><stop offset="100%" stopColor={chap.accent} stopOpacity="0"/></radialGradient>
      </defs>
      <rect width="320" height="110" fill={`url(#sg${chapter})`} rx="10"/>
      <rect width="320" height="110" fill={`url(#sr${chapter})`} rx="10"/>
      {chapter===0&&<><rect x="0" y="0" width="28" height="110" rx="4" fill="#041208" opacity="0.9"/><rect x="285" y="0" width="28" height="110" rx="4" fill="#041208" opacity="0.85"/><path d="M0,85 Q80,75 160,80 Q240,85 320,75 L320,110 L0,110Z" fill="#052e10" opacity="0.8"/><text x="155" y="62" fontSize="20" textAnchor="middle" opacity="0.6">🌲</text></>}
      {chapter===1&&<><polygon points="0,110 20,50 40,110" fill="#1e1b6b" opacity="0.8"/><polygon points="280,110 300,42 320,110" fill="#1e1b6b" opacity="0.75"/><text x="150" y="55" fontSize="18" textAnchor="middle" opacity="0.65">💎</text></>}
      {chapter===2&&<><rect x="130" y="28" width="60" height="35" rx="2" fill="#0c2a4a" opacity="0.7"/><rect x="125" y="18" width="14" height="22" rx="2" fill="#0c2a4a" opacity="0.7"/><rect x="181" y="18" width="14" height="22" rx="2" fill="#0c2a4a" opacity="0.7"/></>}
      {chapter===3&&<><path d="M0,55 Q80,42 160,50 Q240,58 320,45 L320,110 L0,110Z" fill="#073e52" opacity="0.5"/><rect x="95" y="25" width="10" height="65" rx="2" fill="#0e4d6e" opacity="0.8"/><rect x="155" y="20" width="10" height="70" rx="2" fill="#0e4d6e" opacity="0.8"/><rect x="215" y="25" width="10" height="65" rx="2" fill="#0e4d6e" opacity="0.75"/></>}
      {chapter===4&&<><rect x="80" y="15" width="160" height="75" rx="3" fill="#1a0a2e" opacity="0.8"/><text x="158" y="62" fontSize="16" textAnchor="middle" opacity="0.5">👁️</text></>}
      <path d="M30,90 Q80,80 130,85 Q180,90 230,82 Q268,76 290,80" stroke={chap.accent} strokeWidth="2" fill="none" strokeDasharray="5,4" opacity="0.5"/>
      {Array.from({ length: total }).map((_, i) => {
        const cx = 30 + (i / (total - 1 || 1)) * 260
        const done = i < puzzleIdx, active = i === puzzleIdx
        return (
          <g key={i}>
            {active && <circle cx={cx} cy={87} r={9} fill={ch.color} opacity="0.25"/>}
            <circle cx={cx} cy={87} r={done ? 5 : active ? 6 : 4} fill={done ? chap.accent : active ? ch.color : 'rgba(255,255,255,0.2)'} opacity={done ? 0.9 : active ? 1 : 0.5}/>
            {active && <circle cx={cx} cy={87} r={3} fill="white" opacity="0.9"/>}
          </g>
        )
      })}
      <text x="8" y="108" fontSize="9" fill="rgba(255,255,255,0.4)">{chap.icon} {chap.title}</text>
    </svg>
  )
}

// ── Login screen ──────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [selectedChar, setSelectedChar] = useState(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const chars = Object.keys(CHARACTERS)

  async function handleLogin() {
    if (!selectedChar || pin.length < 4) return
    playClick()
    setLoading(true); setError('')
    const ch = CHARACTERS[selectedChar]
    const { player, error: err } = await loginPlayer(ch.name, pin)
    if (err) { setError(err); setLoading(false); return }
    const progress = await loadProgress(player.id)
    startMusic()
    onLogin(player, progress)
    setLoading(false)
  }

  const st = {
    bg: { minHeight: '100vh', background: 'linear-gradient(135deg,#0a0820,#1a0f3a,#0d0618)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'system-ui,sans-serif', color: '#fff' },
    card: { background: 'rgba(255,255,255,0.07)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.12)', padding: '2rem', width: '100%', maxWidth: 420 },
    charBtn: (name) => ({ background: selectedChar === name ? `${CHARACTERS[name].color}25` : 'rgba(255,255,255,0.05)', border: `2px solid ${selectedChar === name ? CHARACTERS[name].color : 'rgba(255,255,255,0.12)'}`, borderRadius: 16, padding: '0.75rem 0.5rem', cursor: 'pointer', flex: 1, transition: 'all 0.18s' }),
    pinBtn: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '0.85rem', fontSize: 20, fontWeight: 700, color: '#fff', cursor: 'pointer', flex: 1 },
  }

  return (
    <div style={st.bg}>
      <div style={st.card}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>✨</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, background: 'linear-gradient(90deg,#a78bfa,#38bdf8,#fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>The Enchanted Realm</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 }}>Sisters of Magic</p>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Who are you?</p>
        <div style={{ display: 'flex', gap: 10, marginBottom: '1.5rem' }}>
          {chars.map(name => {
            const ch = CHARACTERS[name]
            return (
              <button key={name} style={st.charBtn(name)} onClick={() => { playClick(); setSelectedChar(name); setPin(''); setError('') }}>
                <div style={{ width: '100%', aspectRatio: '9/14', borderRadius: 10, overflow: 'hidden', marginBottom: 6 }}>
                  <img src={AVATARS[name]} alt={ch.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}/>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: selectedChar === name ? ch.color : '#fff' }}>{ch.name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{ch.power}</div>
              </button>
            )
          })}
        </div>
        {selectedChar && (
          <>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Enter your PIN</p>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', padding: '0.75rem', textAlign: 'center', fontSize: 28, letterSpacing: 12, marginBottom: 12, minHeight: 52 }}>
              {'●'.repeat(pin.length)}{'○'.repeat(Math.max(0, 4 - pin.length))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
              {[1,2,3,4,5,6,7,8,9].map(n => <button key={n} style={st.pinBtn} onClick={() => { playClick(); pin.length < 4 && setPin(p => p + n) }}>{n}</button>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: '1.25rem' }}>
              <div/>
              <button style={st.pinBtn} onClick={() => { playClick(); pin.length < 4 && setPin(p => p + '0') }}>0</button>
              <button style={{ ...st.pinBtn, background: 'rgba(255,255,255,0.05)' }} onClick={() => setPin(p => p.slice(0, -1))}>⌫</button>
            </div>
            {error && <p style={{ color: '#f87171', fontSize: 13, textAlign: 'center', marginBottom: 10 }}>{error}</p>}
            <button onClick={handleLogin} disabled={pin.length < 4 || loading} style={{ width: '100%', background: pin.length === 4 && !loading ? CHARACTERS[selectedChar].color : 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 12, padding: '0.85rem', color: '#fff', fontWeight: 700, fontSize: 16, cursor: pin.length === 4 ? 'pointer' : 'default', opacity: pin.length === 4 ? 1 : 0.4, transition: 'all 0.18s' }}>
              {loading ? 'Entering the realm...' : `Enter as ${CHARACTERS[selectedChar].name} ✨`}
            </button>
            <a href="/parent" style={{ display: 'block', marginTop: 14, color: 'rgba(255,255,255,0.2)', fontSize: 11, textAlign: 'center', textDecoration: 'none' }}>Parent Dashboard</a>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null)
  const [progress, setProgress] = useState(null)
  const [allProgress, setAllProgress] = useState([])
  const [currentPuzzle, setCurrentPuzzle] = useState(null)
  const [selected, setSelected] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [showHint, setShowHint] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [chapterComplete, setChapterComplete] = useState(false)
  const [showSiblings, setShowSiblings] = useState(false)
  const [mute, setMute] = useState(false)
  const [showWinner, setShowWinner] = useState(false)
  const [winner, setWinner] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const timerRef = useRef(null)
  const channelRef = useRef(null)
  const sessionStart = useRef(null)

  useEffect(() => {
    if (!session) return
    loadAllProgress().then(setAllProgress)
    channelRef.current = subscribeToProgress(payload => {
      setAllProgress(prev => prev.map(r => r.id === payload.new.id ? { ...r, ...payload.new } : r))
      if (payload.new.player_id === session.player.id) setProgress(prev => ({ ...prev, ...payload.new }))
    })
    return () => channelRef.current?.unsubscribe()
  }, [session])

  async function startSession(playerId, character) {
    const { supabase } = await import('./supabase.js')
    sessionStart.current = new Date()
    const { data } = await supabase.from('sessions').insert({ player_id: playerId, character, puzzles_solved: 0, hints_used: 0, wrong_answers: 0 }).select().single()
    if (data) setSessionId(data.id)
  }

  async function endSession(stats) {
    if (!sessionId) return
    const { supabase } = await import('./supabase.js')
    await supabase.from('sessions').update({ ended_at: new Date().toISOString(), ...stats }).eq('id', sessionId)
  }

  function handleLogin(player, prog) {
    setSession({ player, character: player.character })
    setProgress(prog)
    startSession(player.id, player.character)
    generatePuzzle(player.character, prog.chapter, prog.puzzle, prog.difficulty)
  }

  function handleLogout() {
    clearTimeout(timerRef.current)
    channelRef.current?.unsubscribe()
    stopMusic()
    endSession({})
    setSession(null); setProgress(null); setAllProgress([])
    setCurrentPuzzle(null); setSelected(null); setFeedback(null)
    setShowHint(false); setChapterComplete(false); setError('')
    setShowWinner(false); setWinner(null); setSessionId(null)
  }

  function toggleMute() {
    const next = !mute
    setMute(next)
    setMuted(next)
    playClick()
  }

  async function persistProgress(updates) {
    const merged = { ...progress, ...updates }
    setProgress(merged)
    await saveProgress(session.player.id, {
      chapter: merged.chapter, puzzle: merged.puzzle, score: merged.score,
      streak: merged.streak, difficulty: merged.difficulty,
      completed_chapters: merged.completed_chapters,
      items: merged.items, skills: merged.skills,
      total_puzzles_solved: merged.total_puzzles_solved || 0,
      total_hints_used: merged.total_hints_used || 0,
      total_wrong_answers: merged.total_wrong_answers || 0,
    })
  }

  async function generatePuzzle(charName, chapter, puzzleIdx, difficulty) {
    setLoading(true); setError(''); setCurrentPuzzle(null)
    setSelected(null); setFeedback(null); setShowHint(false)
    const ch = CHARACTERS[charName]
    const chap = CHAPTERS[chapter]
    const pType = PUZZLE_TYPES[charName][puzzleIdx % PUZZLE_TYPES[charName].length]
    const diffLabel = ['standard','harder','very challenging'][difficulty - 1]
    try {
      const res = await fetch('/api/puzzle', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: `You are a puzzle generator for "The Enchanted Realm: Sisters of Magic".
Generate a UNIQUE puzzle:
- Player: ${ch.name}, age ${ch.age}, power: ${ch.power}
- Chapter: "${chap.title}" — ${chap.theme}
- Puzzle type: ${pType} — Difficulty: ${diffLabel}
- Age guidance: ${ch.puzzleStyle}
Rules: fit the fantasy setting, frame as ${ch.name}'s challenge, be original with numbers/words/logic.
Respond ONLY valid JSON no markdown:
{"narration":"2-sentence story setup max 35 words mentioning ${ch.name}","question":"puzzle question 1-3 sentences","options":["correct answer","wrong 2","wrong 3","wrong 4"],"answer":"exact correct answer text","hint":"helpful hint 1 sentence"}` }] })
      })
      const data = await res.json()
      const raw = data.content?.map(i => i.text || '').join('') || ''
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
      setCurrentPuzzle({ ...parsed, options: [...parsed.options].sort(() => Math.random() - 0.5) })
    } catch { setError('The magic is flickering... tap to try again.') }
    setLoading(false)
  }

  async function submitAnswer() {
    if (!selected || !currentPuzzle || !progress) return
    const correct = selected === currentPuzzle.answer
    setFeedback(correct ? 'correct' : 'wrong')
    correct ? playCorrect() : playWrong()

    const p = session.character
    const streak = correct ? progress.streak + 1 : 0
    const difficulty = correct ? (streak >= 3 ? Math.min(3, progress.difficulty + 1) : progress.difficulty) : Math.max(1, progress.difficulty - 1)
    const score = progress.score + (correct ? 100 + (progress.streak * 10) - (showHint ? 20 : 0) : 0)
    const totalWrong = (progress.total_wrong_answers || 0) + (correct ? 0 : 1)
    const totalHints = (progress.total_hints_used || 0) + (showHint ? 1 : 0)
    await persistProgress({ score, streak, difficulty, total_wrong_answers: totalWrong, total_hints_used: totalHints })

    timerRef.current = setTimeout(async () => {
      if (correct) {
        const isLast = progress.puzzle >= PUZZLE_TYPES[p].length - 1
        if (isLast) {
          playChapterComplete()
          const ch = CHARACTERS[p]
          const newChapter = Math.min(progress.chapter + 1, CHAPTERS.length - 1)
          const newCompleted = [...progress.completed_chapters, progress.chapter]
          const newItems = [...progress.items, ch.weapon[Math.min(progress.chapter + 1, 4)]]
          const newSkills = [...progress.skills, ch.skill[Math.min(progress.chapter + 1, 4)]]
          const totalSolved = (progress.total_puzzles_solved || 0) + 1
          await persistProgress({ chapter: newChapter, puzzle: 0, completed_chapters: newCompleted, items: newItems, skills: newSkills, total_puzzles_solved: totalSolved })

          // Check if all chapters done → winner!
          if (newCompleted.length >= CHAPTERS.length) {
            playLevelUp()
            setWinner(session.player)
            setShowWinner(true)
          } else {
            setChapterComplete(true)
          }
        } else {
          const next = progress.puzzle + 1
          const totalSolved = (progress.total_puzzles_solved || 0) + 1
          if (streak >= 3 && difficulty > progress.difficulty) playLevelUp()
          await persistProgress({ puzzle: next, total_puzzles_solved: totalSolved })
          generatePuzzle(p, progress.chapter, next, difficulty)
        }
      } else {
        setSelected(null); setFeedback(null)
      }
    }, 1600)
  }

  async function continueAfterChapter() {
    setChapterComplete(false); setCurrentPuzzle(null)
    generatePuzzle(session.character, progress.chapter, progress.puzzle, progress.difficulty)
  }

  if (!session || !progress) return <LoginScreen onLogin={handleLogin}/>

  const p = session.character
  const char = CHARACTERS[p]
  const chap = CHAPTERS[progress.chapter] || CHAPTERS[0]
  const totalPuzzles = PUZZLE_TYPES[p].length * CHAPTERS.length
  const completedPuzzles = (progress.completed_chapters.length * PUZZLE_TYPES[p].length) + progress.puzzle
  const progressPct = Math.round((completedPuzzles / totalPuzzles) * 100)
  const others = allProgress.filter(r => r.character !== p && r.character !== 'parent')
  const chapDone = progress.completed_chapters.length

  const st = {
    bg: { minHeight: '100vh', background: 'linear-gradient(135deg,#0a0820,#1a0f3a,#0d0618)', padding: 0, fontFamily: 'system-ui,sans-serif', color: '#fff' },
    card: { background: 'rgba(255,255,255,0.06)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', padding: '1rem' },
    opt: (col, active, ok, bad) => ({ background: ok ? '#16a34a22' : bad ? '#dc262622' : active ? `${col}22` : 'rgba(255,255,255,0.04)', border: `1.5px solid ${ok ? '#16a34a' : bad ? '#dc2626' : active ? col : 'rgba(255,255,255,0.12)'}`, borderRadius: 10, padding: '0.6rem 0.85rem', cursor: feedback ? 'default' : 'pointer', color: '#fff', fontSize: 13, textAlign: 'left', width: '100%', marginBottom: 7, fontWeight: active ? 600 : 400, transition: 'all 0.18s' }),
  }

  return (
    <div style={st.bg}>
      {showWinner && <WinnerScreen allProgress={allProgress} winner={winner} onClose={() => setShowWinner(false)}/>}

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '5px 10px', color: '#fff', cursor: 'pointer', fontSize: 12 }}>⇦ Switch</button>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.38)', marginBottom: 2 }}>
              <span>{char.avatar} {char.name} — {chap.title} {progress.streak >= 2 ? `🔥${progress.streak}` : ''}</span>
              <span>{progress.score.toLocaleString()} pts</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
              <div style={{ background: char.color, width: `${progressPct}%`, height: '100%', borderRadius: 4, transition: 'width 0.5s' }}/>
            </div>
          </div>
          <button onClick={() => { playClick(); setShowSiblings(x => !x) }} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '5px 9px', color: '#fff', cursor: 'pointer', fontSize: 11 }}>👀</button>
          <button onClick={toggleMute} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '5px 9px', color: '#fff', cursor: 'pointer', fontSize: 14 }}>{mute ? '🔇' : '🔊'}</button>
        </div>

        {showSiblings && (
          <div style={{ ...st.card, marginBottom: '0.75rem' }}>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>Live Rivals</p>
            {others.length === 0 && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Rivals haven't logged in yet!</p>}
            {others.map(r => {
              const och = CHARACTERS[r.character]
              if (!och) return null
              const opct = Math.round(((r.completed_chapters.length * PUZZLE_TYPES[r.character].length + r.puzzle) / (PUZZLE_TYPES[r.character].length * CHAPTERS.length)) * 100)
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <img src={AVATARS[r.character]} alt={och.name} style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', objectPosition: 'top' }}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span>{och.name}</span><span style={{ color: och.color }}>{r.score.toLocaleString()} pts</span></div>
                    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 3, height: 3, marginTop: 2, overflow: 'hidden' }}><div style={{ background: och.color, width: `${opct}%`, height: '100%', borderRadius: 3 }}/></div>
                  </div>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>{opct}%</span>
                </div>
              )
            })}
          </div>
        )}

        {chapterComplete ? (
          <div style={{ ...st.card, textAlign: 'center', padding: '2rem 1.5rem' }}>
            <div style={{ fontSize: 46, marginBottom: 8 }}>🎉</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 5px' }}>Chapter Complete!</h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: '0 0 14px' }}>{CHAPTERS[Math.max(chapDone - 1, 0)].title} conquered!</p>
            <div style={{ background: `${char.color}15`, border: `1px solid ${char.color}40`, borderRadius: 12, padding: '1rem', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginBottom: 3 }}>New weapon</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: char.color }}>⚔️ {char.weapon[Math.min(chapDone, 4)]}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 8, marginBottom: 3 }}>New skill</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: char.color }}>✨ {char.skill[Math.min(chapDone, 4)]}</div>
            </div>
            {progress.chapter < CHAPTERS.length && (
              <button onClick={() => { playClick(); continueAfterChapter() }} style={{ background: char.color, border: 'none', borderRadius: 11, padding: '0.7rem 1.8rem', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                Enter {CHAPTERS[progress.chapter]?.title} →
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '155px 1fr', gap: 10, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${char.color}40` }}>
                <img src={AVATARS[p]} alt={char.name} style={{ width: '100%', objectFit: 'cover', objectPosition: 'top' }}/>
              </div>
              {progress.items.length > 0 && (
                <div style={{ ...st.card, padding: '0.55rem' }}>
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: 1 }}>Arsenal</p>
                  {progress.items.slice(-2).map((item, i) => <div key={i} style={{ fontSize: 10, color: char.color, marginBottom: 2 }}>⚔️ {item}</div>)}
                  {progress.skills.slice(-2).map((skill, i) => <div key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>✨ {skill}</div>)}
                </div>
              )}
            </div>

            <div>
              {loading ? (
                <div style={{ ...st.card, textAlign: 'center', padding: '2.5rem 1rem' }}>
                  <div style={{ fontSize: 30, marginBottom: 10 }}>🔮</div>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Conjuring your challenge...</p>
                </div>
              ) : error ? (
                <div style={{ ...st.card, textAlign: 'center', padding: '1.5rem' }}>
                  <p style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 12, fontSize: 13 }}>{error}</p>
                  <button onClick={() => generatePuzzle(p, progress.chapter, progress.puzzle, progress.difficulty)} style={{ background: char.color, border: 'none', borderRadius: 9, padding: '0.5rem 1.2rem', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Try again</button>
                </div>
              ) : currentPuzzle ? (
                <>
                  <div style={{ marginBottom: 8 }}><SceneSVG chapter={progress.chapter} puzzleIdx={progress.puzzle} playerName={p}/></div>
                  <div style={{ ...st.card, marginBottom: 8, borderColor: `${char.color}40`, padding: '0.65rem 0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 10, color: char.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{chap.icon} Puzzle {progress.puzzle + 1}/{PUZZLE_TYPES[p].length}</span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>{'★'.repeat(progress.difficulty)}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.55, margin: 0, fontStyle: 'italic' }}>{currentPuzzle.narration}</p>
                  </div>
                  <div style={{ ...st.card, marginBottom: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.55, margin: '0 0 10px' }}>{currentPuzzle.question}</p>
                    {currentPuzzle.options.map(opt => {
                      const isSel = opt === selected, isOk = feedback && opt === currentPuzzle.answer, isBad = feedback === 'wrong' && isSel
                      return <button key={opt} onClick={() => { if (!feedback) { playClick(); setSelected(opt) } }} style={st.opt(char.color, isSel, isOk, isBad)}>{opt}</button>
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <button onClick={() => { playClick(); setShowHint(x => !x) }} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '0.55rem', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: 12 }}>{showHint ? 'Hide' : '💡 Hint'}</button>
                    <button onClick={submitAnswer} disabled={!selected || !!feedback} style={{ flex: 2, background: selected && !feedback ? char.color : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 9, padding: '0.55rem 1rem', color: '#fff', fontWeight: 700, cursor: selected && !feedback ? 'pointer' : 'default', fontSize: 13, opacity: selected && !feedback ? 1 : 0.4 }}>
                      {feedback === 'correct' ? '✓ Correct!' : feedback === 'wrong' ? '✗ Try again' : 'Submit'}
                    </button>
                  </div>
                  {showHint && <div style={{ ...st.card, marginTop: 7, borderColor: '#fbbf2428', background: '#fbbf2406', padding: '0.6rem 0.85rem' }}><p style={{ margin: 0, fontSize: 12, color: '#fde68a' }}>💡 {currentPuzzle.hint}</p></div>}
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
