import React, { useState, useEffect, useRef, useCallback } from 'react'
import { loginPlayer, loadProgress, saveProgress, loadAllProgress,
  subscribeToProgress, subscribeToSabotages, sendSabotage, markSabotageSeen,
  getPendingSabotages, startSessionDB, endSessionDB, broadcastWin, resetAllProgressDB } from './supabase.js'
import { playCorrect, playWrong, playClick, playLevelUp, playChapterComplete,
  playConfetti, startMusic, stopMusic, setMuted } from './sounds.js'

const AVATARS = { charlotte: '/charlotte.png', rileigh: '/rileigh.png', margaux: '/margaux.png' }

const CHARACTERS = {
  charlotte: {
    name: 'Charlotte', age: 7, power: 'Heart Magic', color: '#38bdf8', avatar: '🌀',
    weapon: ['Wand of Hearts','Crystal Staff','Rainbow Scepter','Moonbeam Rod','Star Prism'],
    skill: ['Healing Touch','Petal Shield','Glow Aura','Spirit Song','Heartfire Burst'],
    sabotageWeapon: 'Heart Trap',
    sabotageEffect: 'extra_question',
    sabotageDesc: 'Forces a rival to answer a bonus question before their next puzzle (no points awarded)',
    puzzleStyle: {
      1: '2nd grade level: single-digit addition/subtraction, simple color/shape patterns, very short riddles with obvious answers, basic counting. Keep it accessible but not too easy.',
      2: '3rd grade level: double-digit addition/subtraction, simple multiplication (2x,3x,4x tables), slightly tricky riddles, pattern completion with 2 variables.',
      3: '4th-5th grade level: multi-step arithmetic, division, word problems, more complex riddles, longer patterns, basic fractions or geometry concepts.',
    },
  },
  rileigh: {
    name: 'Rileigh', age: 13, power: 'Star Magic', color: '#a78bfa', avatar: '🌟',
    weapon: ['Starlight Wand','Celestial Staff','Nova Lance','Comet Blade','Eclipse Sword'],
    skill: ['Star Map','Gravity Pull','Void Step','Constellation Lock','Supernova Strike'],
    sabotageWeapon: 'Star Lock',
    sabotageEffect: 'scramble',
    sabotageDesc: "Scrambles a rival's answer options and removes their hint button for one puzzle",
    puzzleStyle: {
      1: 'age 13 standard: logic deduction, number sequences, word puzzles, vocabulary, multi-step reasoning.',
      2: 'age 13 harder: complex logic chains, tricky number patterns, advanced vocabulary, lateral thinking riddles.',
      3: 'age 13 very challenging: advanced logic paradoxes, algebraic thinking, complex word puzzles, multi-layer deduction.',
    },
  },
  margaux: {
    name: 'Margaux', age: 9, power: 'Storm Magic', color: '#fbbf24', avatar: '⚡',
    weapon: ['Thunder Wand','Storm Trident','Lightning Blade','Tempest Bow','Cyclone Gauntlet'],
    skill: ['Wind Dash','Thunder Clap','Storm Eye','Gale Force','Hurricane Fury'],
    sabotageWeapon: 'Thunder Strike',
    sabotageEffect: 'points_deduct',
    sabotageDesc: 'Deducts 150 points from a rival instantly',
    puzzleStyle: {
      1: 'age 9 standard: multiplication/division basics, medium riddles, memory sequences, simple logic.',
      2: 'age 9 harder: multi-step math, trickier riddles, longer sequences, spatial reasoning.',
      3: 'age 9 very challenging: complex arithmetic, challenging logic, multi-step word problems, advanced patterns.',
    },
  },
}

const CHAPTERS = [
  { title: 'The Whispering Forest',   icon: '🌲', theme: 'an enchanted forest full of talking animals and ancient glowing trees',       bg: ['#061a0e','#0d3320','#071410'], accent: '#22c55e' },
  { title: 'The Crystal Caves',       icon: '💎', theme: 'glittering underground caves filled with magical gems and echoing riddles',     bg: ['#08061f','#180d45','#05030f'], accent: '#818cf8' },
  { title: 'The Sky Kingdom',         icon: '☁️', theme: 'a floating kingdom above the clouds ruled by wind spirits',                     bg: ['#030f1f','#072444','#020810'], accent: '#38bdf8' },
  { title: 'The Sunken Temple',       icon: '🏛️', theme: 'an ancient underwater temple with glowing runes and sea creatures',             bg: ['#031218','#052e3e','#020c10'], accent: '#06b6d4' },
  { title: "The Shadow Queen's Lair", icon: '🌑', theme: 'the dark fortress of the Shadow Queen, the final challenge',                    bg: ['#0a0212','#1a052e','#050008'], accent: '#c084fc' },
]

const PUZZLE_TYPES = {
  charlotte: ['math problem','pattern completion','short riddle','counting or grouping','spot the difference'],
  rileigh:   ['logic deduction','number sequence','word riddle','multi-step math','vocabulary puzzle'],
  margaux:   ['memory sequence','multiplication or division','riddle','number pattern','spatial logic'],
}

const TOTAL_PUZZLES = 25

// ── Confetti ──────────────────────────────────────────────────────
function Confetti() {
  const colors = ['#38bdf8','#a78bfa','#fbbf24','#f472b6','#4ade80','#fb923c']
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i, color: colors[i % colors.length],
    left: Math.random() * 100, delay: Math.random() * 2,
    dur: 2.5 + Math.random() * 2, size: 6 + Math.random() * 8,
  }))
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 100, overflow: 'hidden' }}>
      <style>{`@keyframes fall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}`}</style>
      {pieces.map(p => <div key={p.id} style={{ position: 'absolute', left: `${p.left}%`, top: -20, width: p.size, height: p.size, background: p.color, borderRadius: p.id % 3 === 0 ? '50%' : 2, animation: `fall ${p.dur}s ${p.delay}s ease-in forwards` }}/>)}
    </div>
  )
}

// ── Winner screen ─────────────────────────────────────────────────
function WinnerScreen({ allProgress, winner, isWinner, onReset }) {
  const [showPodium, setShowPodium] = useState(false)
  const [resetting, setResetting] = useState(false)
  useEffect(() => { playConfetti(); const t = setTimeout(() => setShowPodium(true), 3500); return () => clearTimeout(t) }, [])

  const sorted = [...allProgress]
    .filter(r => r.character && r.character !== 'parent')
    .sort((a, b) => {
      const aDone = a.completed_chapters?.length >= 5
      const bDone = b.completed_chapters?.length >= 5
      if (aDone && !bDone) return -1
      if (!aDone && bDone) return 1
      return b.score - a.score
    })

  const medals = ['🥇','🥈','🥉']
  const podiumHeights = [180, 130, 100]
  const winChar = CHARACTERS[winner]

  async function handleReset() {
    if (!window.confirm('Reset the game for all sisters? This cannot be undone.')) return
    setResetting(true)
    await resetAllProgressDB()
    onReset()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 99, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'system-ui,sans-serif', color: '#fff' }}>
      <Confetti/>
      {!showPodium ? (
        <div style={{ textAlign: 'center', zIndex: 101 }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>🏆</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px', background: 'linear-gradient(90deg,#fbbf24,#f472b6,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {winChar?.name} Wins!
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>
            {isWinner ? 'You completed the Enchanted Realm first! 🎉' : `${winChar?.name} has completed the Enchanted Realm!`}
          </p>
          <img src={AVATARS[winner]} alt="" style={{ width: 140, height: 180, objectFit: 'cover', objectPosition: 'top', borderRadius: 16, marginTop: 16, border: `3px solid ${winChar?.color}` }}/>
        </div>
      ) : (
        <div style={{ textAlign: 'center', zIndex: 101, width: '100%', maxWidth: 500 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: '1.5rem' }}>🏆 Final Standings</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 12, marginBottom: '1.5rem' }}>
            {[sorted[1], sorted[0], sorted[2]].map((r, podiumPos) => {
              if (!r) return <div key={podiumPos} style={{ width: 120 }}/>
              const rank = sorted.indexOf(r)
              const ch = CHARACTERS[r.character]
              return (
                <div key={r.character} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 130 }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{medals[rank]}</div>
                  <img src={AVATARS[r.character]} alt={ch?.name} style={{ width: 60, height: 76, objectFit: 'cover', objectPosition: 'top', borderRadius: 10, border: `2px solid ${ch?.color}`, marginBottom: 6 }}/>
                  <div style={{ fontWeight: 700, fontSize: 14, color: ch?.color }}>{ch?.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{r.score.toLocaleString()} pts</div>
                  <div style={{ background: ch?.color, width: '100%', height: podiumHeights[podiumPos === 1 ? 0 : podiumPos === 0 ? 1 : 2], borderRadius: '6px 6px 0 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 8, fontSize: 18, fontWeight: 700 }}>
                    {podiumPos === 1 ? '1' : podiumPos === 0 ? '2' : '3'}
                  </div>
                </div>
              )
            })}
          </div>
          <button onClick={handleReset} disabled={resetting} style={{ background: '#7c3aed', border: 'none', borderRadius: 12, padding: '0.75rem 2rem', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: resetting ? 0.5 : 1 }}>
            {resetting ? 'Resetting...' : '🔄 Play Again — Reset Game'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Sabotage notification banner ──────────────────────────────────
function SabotageBanner({ sabotage, onDismiss }) {
  const from = CHARACTERS[sabotage.from_character]
  const effects = {
    extra_question: '💔 Heart Trap! You must answer a bonus question before continuing.',
    scramble: '🌟 Star Lock! Your answers are scrambled and hints are disabled for this puzzle.',
    points_deduct: '⚡ Thunder Strike! You just lost 150 points!',
  }
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, background: '#7c3aed', padding: '1rem', textAlign: 'center', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
        ⚔️ {from?.name} used {sabotage.weapon} on you!
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginBottom: 8 }}>{effects[sabotage.effect]}</div>
      <button onClick={onDismiss} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '4px 16px', color: '#fff', cursor: 'pointer', fontSize: 12 }}>Got it</button>
    </div>
  )
}

// ── Weapon sabotage panel ─────────────────────────────────────────
function SabotagePanel({ character, allProgress, weaponUsed, onSabotage, onClose }) {
  const ch = CHARACTERS[character]
  const rivals = allProgress.filter(r => r.character !== character && r.character !== 'parent')
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: '#1a0f3a', borderRadius: 20, border: `2px solid ${ch.color}40`, padding: '1.5rem', width: '100%', maxWidth: 380, color: '#fff' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>⚔️ Use Weapon</h3>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '0 0 16px' }}>
          {weaponUsed ? 'You have already used your weapon this game.' : `${ch.sabotageWeapon}: ${ch.sabotageDesc}`}
        </p>
        {!weaponUsed && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Choose your target:</p>
            {rivals.map(r => {
              const rch = CHARACTERS[r.character]
              if (!rch) return null
              const pct = Math.round(((r.completed_chapters?.length * 5 + r.puzzle) / TOTAL_PUZZLES) * 100)
              return (
                <button key={r.character} onClick={() => onSabotage(r.character)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: `${rch.color}15`, border: `1.5px solid ${rch.color}44`, borderRadius: 12, padding: '0.75rem', marginBottom: 8, cursor: 'pointer', color: '#fff' }}>
                  <img src={AVATARS[r.character]} alt={rch.name} style={{ width: 36, height: 46, objectFit: 'cover', objectPosition: 'top', borderRadius: 8 }}/>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: rch.color }}>{rch.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{r.score.toLocaleString()} pts · {pct}% complete</div>
                  </div>
                  <span style={{ fontSize: 18 }}>🎯</span>
                </button>
              )
            })}
          </div>
        )}
        <button onClick={onClose} style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '0.6rem', color: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
      </div>
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

  const s = {
    bg: { minHeight: '100vh', background: 'linear-gradient(135deg,#0a0820,#1a0f3a,#0d0618)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'system-ui,sans-serif', color: '#fff' },
    card: { background: 'rgba(255,255,255,0.07)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.12)', padding: '2rem', width: '100%', maxWidth: 420 },
    charBtn: (name) => ({ background: selectedChar === name ? `${CHARACTERS[name].color}25` : 'rgba(255,255,255,0.05)', border: `2px solid ${selectedChar === name ? CHARACTERS[name].color : 'rgba(255,255,255,0.12)'}`, borderRadius: 16, padding: '0.75rem 0.5rem', cursor: 'pointer', flex: 1, transition: 'all 0.18s' }),
    pinBtn: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '0.85rem', fontSize: 20, fontWeight: 700, color: '#fff', cursor: 'pointer', flex: 1 },
  }

  return (
    <div style={s.bg}>
      <div style={s.card}>
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
              <button key={name} style={s.charBtn(name)} onClick={() => { playClick(); setSelectedChar(name); setPin(''); setError('') }}>
                <div style={{ width: '100%', aspectRatio: '9/14', borderRadius: 10, overflow: 'hidden', marginBottom: 6 }}>
                  <img src={AVATARS[name]} alt={ch.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}/>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: selectedChar === name ? ch.color : '#fff' }}>{ch.name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{ch.power}</div>
              </button>
            )
          })}
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Enter your PIN</p>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', padding: '0.75rem', textAlign: 'center', fontSize: 28, letterSpacing: 12, marginBottom: 12, minHeight: 52 }}>
          {'●'.repeat(pin.length)}{'○'.repeat(Math.max(0, 4 - pin.length))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
          {[1,2,3,4,5,6,7,8,9].map(n => <button key={n} style={s.pinBtn} onClick={() => { playClick(); pin.length < 4 && setPin(p => p + n) }}>{n}</button>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: '1.25rem' }}>
          <div/>
          <button style={s.pinBtn} onClick={() => { playClick(); pin.length < 4 && setPin(p => p + '0') }}>0</button>
          <button style={{ ...s.pinBtn, background: 'rgba(255,255,255,0.05)' }} onClick={() => setPin(p => p.slice(0, -1))}>⌫</button>
        </div>
        {error && <p style={{ color: '#f87171', fontSize: 13, textAlign: 'center', marginBottom: 10 }}>{error}</p>}
        {selectedChar && (
          <button onClick={handleLogin} disabled={pin.length < 4 || loading} style={{ width: '100%', background: pin.length === 4 && !loading ? CHARACTERS[selectedChar].color : 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 12, padding: '0.85rem', color: '#fff', fontWeight: 700, fontSize: 16, cursor: pin.length === 4 ? 'pointer' : 'default', opacity: pin.length === 4 ? 1 : 0.4, transition: 'all 0.18s' }}>
            {loading ? 'Entering the realm...' : `Enter as ${CHARACTERS[selectedChar].name} ✨`}
          </button>
        )}
        <a href="/parent" style={{ display: 'block', marginTop: 14, color: 'rgba(255,255,255,0.2)', fontSize: 11, textAlign: 'center', textDecoration: 'none' }}>Parent Dashboard</a>
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
  const [hintRevealed, setHintRevealed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [chapterComplete, setChapterComplete] = useState(false)
  const [showSiblings, setShowSiblings] = useState(false)
  const [mute, setMute] = useState(false)
  const [showWinner, setShowWinner] = useState(false)
  const [winnerChar, setWinnerChar] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [pendingSabotage, setPendingSabotage] = useState(null)
  const [showSabotagePanel, setShowSabotagePanel] = useState(false)
  const [activeSabotageEffect, setActiveSabotageEffect] = useState(null)
  const [isExtraQuestion, setIsExtraQuestion] = useState(false)
  const timerRef = useRef(null)
  const channelRef = useRef(null)
  const sabotageChannelRef = useRef(null)
  const sessionStatsRef = useRef({ puzzles_solved: 0, hints_used: 0, wrong_answers: 0 })

  // ── Session end on browser close ──────────────────────────────
  useEffect(() => {
    const handleUnload = () => { if (sessionId) endSessionDB(sessionId, sessionStatsRef.current) }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [sessionId])

  // ── Realtime subscriptions ────────────────────────────────────
  useEffect(() => {
    if (!session) return
    loadAllProgress().then(data => {
      setAllProgress(data)
      // Check if game already won
      const any = data.find(r => r.game_won_by)
      if (any) { setWinnerChar(any.game_won_by); setShowWinner(true) }
    })

    channelRef.current = subscribeToProgress(payload => {
      setAllProgress(prev => prev.map(r => r.id === payload.new.id ? { ...r, ...payload.new } : r))
      if (payload.new.player_id === session.player.id) {
        setProgress(prev => ({ ...prev, ...payload.new }))
      }
      // Detect win broadcast
      if (payload.new.game_won_by && payload.new.game_won_by !== '') {
        setWinnerChar(payload.new.game_won_by)
        setShowWinner(true)
      }
    })

    sabotageChannelRef.current = subscribeToSabotages(async payload => {
      const s = payload.new
      if (s.to_character === session.character) {
        // Apply points deduct immediately
        if (s.effect === 'points_deduct') {
          setProgress(prev => {
            const newScore = Math.max(0, (prev?.score || 0) - 150)
            saveProgress(session.player.id, { score: newScore })
            return { ...prev, score: newScore }
          })
        }
        setPendingSabotage(s)
        setActiveSabotageEffect(s.effect)
      }
    })

    // Check pending sabotages on login
    getPendingSabotages(session.character).then(sabs => {
      if (sabs.length > 0) {
        const s = sabs[0]
        if (s.effect === 'points_deduct') {
          setProgress(prev => {
            const newScore = Math.max(0, (prev?.score || 0) - 150)
            saveProgress(session.player.id, { score: newScore })
            return { ...prev, score: newScore }
          })
        }
        setPendingSabotage(s)
        setActiveSabotageEffect(s.effect)
      }
    })

    return () => {
      channelRef.current?.unsubscribe()
      sabotageChannelRef.current?.unsubscribe()
    }
  }, [session])

  function handleLogin(player, prog) {
    setSession({ player, character: player.character })
    setProgress(prog)
    startSessionDB(player.id, player.character).then(s => {
      if (s) setSessionId(s.id)
    })
    generatePuzzle(player.character, prog.chapter, prog.puzzle, prog.difficulty, prog.puzzle_history || [])
  }

  function handleLogout() {
    clearTimeout(timerRef.current)
    channelRef.current?.unsubscribe()
    sabotageChannelRef.current?.unsubscribe()
    stopMusic()
    endSessionDB(sessionId, sessionStatsRef.current)
    setSession(null); setProgress(null); setAllProgress([])
    setCurrentPuzzle(null); setSelected(null); setFeedback(null)
    setShowHint(false); setHintRevealed(false); setChapterComplete(false)
    setError(''); setShowWinner(false); setWinnerChar(null)
    setSessionId(null); setPendingSabotage(null); setActiveSabotageEffect(null)
    setIsExtraQuestion(false); setShowSabotagePanel(false)
    sessionStatsRef.current = { puzzles_solved: 0, hints_used: 0, wrong_answers: 0 }
  }

  function toggleMute() {
    const next = !mute; setMute(next); setMuted(next); playClick()
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
      hints_remaining: merged.hints_remaining ?? 3,
      weapon_used: merged.weapon_used || false,
      puzzle_history: merged.puzzle_history || [],
    })
  }

  async function generatePuzzle(charName, chapter, puzzleIdx, difficulty, history = [], extra = false) {
    setLoading(true); setError(''); setCurrentPuzzle(null)
    setSelected(null); setFeedback(null); setShowHint(false); setHintRevealed(false)
    const ch = CHARACTERS[charName]
    const chap = CHAPTERS[chapter] || CHAPTERS[0]
    const pType = PUZZLE_TYPES[charName][puzzleIdx % PUZZLE_TYPES[charName].length]
    const diffLevel = difficulty || 1
    const styleGuide = ch.puzzleStyle[diffLevel]
    const historyNote = history.length > 0
      ? `IMPORTANT: Do NOT repeat or closely resemble any of these previous puzzle topics/answers: ${history.slice(-15).join('; ')}`
      : ''
    const scramble = activeSabotageEffect === 'scramble'
    try {
      const res = await fetch('/api/puzzle', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content:
`You are a puzzle generator for "The Enchanted Realm: Sisters of Magic".
Generate a UNIQUE puzzle:
- Player: ${ch.name}, age ${ch.age}, power: ${ch.power}
- Chapter: "${chap.title}" — ${chap.theme}
- Puzzle type: ${pType}
- Difficulty guidance: ${styleGuide}
${extra ? '- This is a BONUS penalty question. Make it slightly easier than normal.' : ''}
${historyNote}
Rules: fit the fantasy setting, frame as ${ch.name}'s challenge, use ORIGINAL numbers/words/logic every time, never reuse concepts from history above.
Respond ONLY valid JSON no markdown:
{"narration":"2-sentence story setup max 35 words mentioning ${ch.name}","question":"puzzle question 1-3 sentences","options":["correct answer","wrong 2","wrong 3","wrong 4"],"answer":"exact correct answer text","hint":"helpful hint 1 sentence"}`
        }] })
      })
      const data = await res.json()
      const raw = data.content?.map(i => i.text || '').join('') || ''
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
      let opts = [...parsed.options].sort(() => Math.random() - 0.5)
      if (scramble) opts = opts.sort(() => Math.random() - 0.5).sort(() => Math.random() - 0.5)
      setCurrentPuzzle({ ...parsed, options: opts, isScrambled: scramble })
    } catch { setError('The magic is flickering... tap to try again.') }
    setLoading(false)
  }

  async function handleSabotageTarget(targetCharacter) {
    const p = session.character
    const ch = CHARACTERS[p]
    setShowSabotagePanel(false)
    await sendSabotage(p, targetCharacter, ch.sabotageWeapon, ch.sabotageEffect)
    await persistProgress({ weapon_used: true })
    playLevelUp()
  }

  async function dismissSabotage() {
    if (pendingSabotage) await markSabotageSeen(pendingSabotage.id)
    setPendingSabotage(null)
    if (activeSabotageEffect === 'extra_question') {
      setIsExtraQuestion(true)
      generatePuzzle(session.character, progress.chapter, progress.puzzle, progress.difficulty, progress.puzzle_history || [], true)
    }
  }

  async function submitAnswer() {
    if (!selected || !currentPuzzle || !progress) return
    const correct = selected === currentPuzzle.answer
    setFeedback(correct ? 'correct' : 'wrong')
    correct ? playCorrect() : playWrong()

    const p = session.character
    const history = [...(progress.puzzle_history || []), currentPuzzle.question.substring(0, 60)]

    if (!correct) {
      sessionStatsRef.current.wrong_answers++
      const totalWrong = (progress.total_wrong_answers || 0) + 1
      const newStreak = 0
      const newDiff = Math.max(1, progress.difficulty - 1)
      await persistProgress({ streak: newStreak, difficulty: newDiff, total_wrong_answers: totalWrong })
      timerRef.current = setTimeout(() => {
        // Generate a NEW question — don't stay on same one
        generatePuzzle(p, progress.chapter, progress.puzzle, newDiff, history)
        setProgress(prev => ({ ...prev, puzzle_history: history }))
        saveProgress(session.player.id, { puzzle_history: history })
      }, 1400)
      return
    }

    // Correct answer
    sessionStatsRef.current.puzzles_solved++
    const streak = progress.streak + 1
    const difficulty = streak >= 2 ? Math.min(3, progress.difficulty + 1) : progress.difficulty
    const hintCost = hintRevealed ? 1 : 0
    const score = progress.score + 100 + (progress.streak * 15) - (hintCost * 20)
    const totalSolved = (progress.total_puzzles_solved || 0) + 1

    if (streak === 2 && difficulty > progress.difficulty) playLevelUp()

    // Extra question (Heart Trap) — don't advance after correct, just clear the effect
    if (isExtraQuestion) {
      setIsExtraQuestion(false)
      setActiveSabotageEffect(null)
      await persistProgress({ score, streak, difficulty, total_puzzles_solved: totalSolved, puzzle_history: history })
      timerRef.current = setTimeout(() => {
        generatePuzzle(p, progress.chapter, progress.puzzle, difficulty, history)
      }, 1400)
      return
    }

    // Clear scramble effect after one puzzle
    if (activeSabotageEffect === 'scramble') setActiveSabotageEffect(null)

    const isLast = progress.puzzle >= PUZZLE_TYPES[p].length - 1
    if (isLast) {
      playChapterComplete()
      const ch = CHARACTERS[p]
      const newChapter = Math.min(progress.chapter + 1, CHAPTERS.length - 1)
      const newCompleted = [...(progress.completed_chapters || []), progress.chapter]
      const newItems = [...(progress.items || []), ch.weapon[Math.min(progress.chapter + 1, 4)]]
      const newSkills = [...(progress.skills || []), ch.skill[Math.min(progress.chapter + 1, 4)]]
      await persistProgress({ chapter: newChapter, puzzle: 0, score, streak, difficulty, completed_chapters: newCompleted, items: newItems, skills: newSkills, total_puzzles_solved: totalSolved, puzzle_history: history })

      if (newCompleted.length >= CHAPTERS.length) {
        playLevelUp()
        await broadcastWin(p)
        setWinnerChar(p)
        timerRef.current = setTimeout(() => setShowWinner(true), 1600)
      } else {
        timerRef.current = setTimeout(() => setChapterComplete(true), 1400)
      }
    } else {
      const next = progress.puzzle + 1
      await persistProgress({ puzzle: next, score, streak, difficulty, total_puzzles_solved: totalSolved, puzzle_history: history })
      timerRef.current = setTimeout(() => generatePuzzle(p, progress.chapter, next, difficulty, history), 1400)
    }
  }

  async function continueAfterChapter() {
    setChapterComplete(false); setCurrentPuzzle(null)
    generatePuzzle(session.character, progress.chapter, progress.puzzle, progress.difficulty, progress.puzzle_history || [])
  }

  function handleWinnerReset() {
    handleLogout()
  }

  if (!session || !progress) return <LoginScreen onLogin={handleLogin}/>

  const p = session.character
  const char = CHARACTERS[p]
  const chap = CHAPTERS[progress.chapter] || CHAPTERS[0]
  const completedPuzzles = ((progress.completed_chapters?.length || 0) * PUZZLE_TYPES[p].length) + (progress.puzzle || 0)
  const progressPct = Math.round((completedPuzzles / TOTAL_PUZZLES) * 100)
  const others = allProgress.filter(r => r.character !== p && r.character !== 'parent')
  const chapDone = progress.completed_chapters?.length || 0
  const hintsLeft = progress.hints_remaining ?? 3
  const diffStars = '★'.repeat(progress.difficulty || 1) + '☆'.repeat(3 - (progress.difficulty || 1))

  const st = {
    bg: { minHeight: '100vh', background: 'linear-gradient(135deg,#0a0820,#1a0f3a,#0d0618)', padding: 0, fontFamily: 'system-ui,sans-serif', color: '#fff' },
    card: { background: 'rgba(255,255,255,0.06)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', padding: '1rem' },
    opt: (col, active, ok, bad) => ({ background: ok ? '#16a34a22' : bad ? '#dc262622' : active ? `${col}22` : 'rgba(255,255,255,0.04)', border: `1.5px solid ${ok ? '#16a34a' : bad ? '#dc2626' : active ? col : 'rgba(255,255,255,0.12)'}`, borderRadius: 10, padding: '0.6rem 0.85rem', cursor: feedback ? 'default' : 'pointer', color: '#fff', fontSize: 13, textAlign: 'left', width: '100%', marginBottom: 7, fontWeight: active ? 600 : 400, transition: 'all 0.18s' }),
  }

  return (
    <div style={st.bg}>
      {showWinner && <WinnerScreen allProgress={allProgress} winner={winnerChar} isWinner={winnerChar === p} onReset={handleWinnerReset}/>}
      {pendingSabotage && <SabotageBanner sabotage={pendingSabotage} onDismiss={dismissSabotage}/>}
      {showSabotagePanel && <SabotagePanel character={p} allProgress={allProgress} weaponUsed={progress.weapon_used} onSabotage={handleSabotageTarget} onClose={() => setShowSabotagePanel(false)}/>}

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0.75rem' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '5px 10px', color: '#fff', cursor: 'pointer', fontSize: 12 }}>⇦</button>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.38)', marginBottom: 2 }}>
              <span>{char.avatar} {char.name} — {chap.title} {progress.streak >= 2 ? `🔥${progress.streak}` : ''}</span>
              <span style={{ color: char.color, fontWeight: 700 }}>{(progress.score || 0).toLocaleString()} pts</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
              <div style={{ background: char.color, width: `${progressPct}%`, height: '100%', borderRadius: 4, transition: 'width 0.5s' }}/>
            </div>
          </div>
          <button onClick={() => { playClick(); setShowSiblings(x => !x) }} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '5px 8px', color: '#fff', cursor: 'pointer', fontSize: 11 }}>👀</button>
          <button onClick={() => { playClick(); setShowSabotagePanel(true) }} style={{ background: progress.weapon_used ? 'rgba(255,255,255,0.04)' : `${char.color}22`, border: `1px solid ${progress.weapon_used ? 'rgba(255,255,255,0.1)' : char.color + '55'}`, borderRadius: 8, padding: '5px 8px', color: progress.weapon_used ? 'rgba(255,255,255,0.3)' : '#fff', cursor: 'pointer', fontSize: 14 }} title={char.sabotageWeapon}>⚔️</button>
          <button onClick={toggleMute} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '5px 8px', color: '#fff', cursor: 'pointer', fontSize: 14 }}>{mute ? '🔇' : '🔊'}</button>
        </div>

        {showSiblings && (
          <div style={{ ...st.card, marginBottom: '0.75rem' }}>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>Live Rivals</p>
            {others.length === 0 && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Rivals haven't logged in yet!</p>}
            {others.map(r => {
              const och = CHARACTERS[r.character]; if (!och) return null
              const opct = Math.round((((r.completed_chapters?.length || 0) * PUZZLE_TYPES[r.character].length + (r.puzzle || 0)) / TOTAL_PUZZLES) * 100)
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <img src={AVATARS[r.character]} alt={och.name} style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', objectPosition: 'top' }}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span>{och.name}</span><span style={{ color: och.color }}>{(r.score || 0).toLocaleString()} pts</span></div>
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
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: '0 0 14px' }}>{CHAPTERS[Math.max(chapDone - 1, 0)]?.title} conquered!</p>
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
            {/* Left: character */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${char.color}40` }}>
                <img src={AVATARS[p]} alt={char.name} style={{ width: '100%', objectFit: 'cover', objectPosition: 'top' }}/>
              </div>
              {/* Difficulty stars */}
              <div style={{ ...st.card, padding: '0.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>DIFFICULTY</div>
                <div style={{ fontSize: 18, color: char.color, letterSpacing: 2 }}>{diffStars}</div>
              </div>
              {/* Hints remaining */}
              <div style={{ ...st.card, padding: '0.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>HINTS LEFT</div>
                <div style={{ fontSize: 16 }}>{'💡'.repeat(hintsLeft)}{'⬜'.repeat(3 - hintsLeft)}</div>
              </div>
              {progress.items?.length > 0 && (
                <div style={{ ...st.card, padding: '0.55rem' }}>
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: 1 }}>Arsenal</p>
                  {progress.items.slice(-2).map((item, i) => <div key={i} style={{ fontSize: 10, color: char.color, marginBottom: 2 }}>⚔️ {item}</div>)}
                  {progress.skills?.slice(-2).map((skill, i) => <div key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>✨ {skill}</div>)}
                </div>
              )}
            </div>

            {/* Right: puzzle */}
            <div>
              {loading ? (
                <div style={{ ...st.card, textAlign: 'center', padding: '2.5rem 1rem' }}>
                  <div style={{ fontSize: 30, marginBottom: 10 }}>🔮</div>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Conjuring your challenge...</p>
                </div>
              ) : error ? (
                <div style={{ ...st.card, textAlign: 'center', padding: '1.5rem' }}>
                  <p style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 12, fontSize: 13 }}>{error}</p>
                  <button onClick={() => generatePuzzle(p, progress.chapter, progress.puzzle, progress.difficulty, progress.puzzle_history || [])} style={{ background: char.color, border: 'none', borderRadius: 9, padding: '0.5rem 1.2rem', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Try again</button>
                </div>
              ) : currentPuzzle ? (
                <>
                  {isExtraQuestion && (
                    <div style={{ background: '#7c3aed22', border: '1px solid #7c3aed55', borderRadius: 10, padding: '0.6rem 0.85rem', marginBottom: 8, fontSize: 12, color: '#c4b5fd' }}>
                      💔 Bonus penalty question — answer correctly to continue!
                    </div>
                  )}
                  <div style={{ marginBottom: 8 }}><SceneSVG chapter={progress.chapter} puzzleIdx={progress.puzzle} playerName={p}/></div>
                  <div style={{ ...st.card, marginBottom: 8, borderColor: `${char.color}40`, padding: '0.65rem 0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 10, color: char.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{chap.icon} Puzzle {(progress.puzzle || 0) + 1}/{PUZZLE_TYPES[p].length}</span>
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
                    {hintsLeft > 0 && !activeSabotageEffect?.includes('scramble') ? (
                      <button onClick={() => {
                        if (hintRevealed) { setShowHint(x => !x); return }
                        playClick(); setShowHint(true); setHintRevealed(true)
                        sessionStatsRef.current.hints_used++
                        const newHints = Math.max(0, hintsLeft - 1)
                        persistProgress({ hints_remaining: newHints, total_hints_used: (progress.total_hints_used || 0) + 1 })
                      }} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '0.55rem', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontSize: 12 }}>
                        {showHint ? 'Hide' : `💡 Hint (${hintsLeft} left)`}
                      </button>
                    ) : (
                      <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9, padding: '0.55rem', color: 'rgba(255,255,255,0.2)', fontSize: 12, textAlign: 'center' }}>
                        {activeSabotageEffect === 'scramble' ? '🔒 Hints blocked' : '💡 No hints left'}
                      </div>
                    )}
                    <button onClick={submitAnswer} disabled={!selected || !!feedback} style={{ flex: 2, background: selected && !feedback ? char.color : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 9, padding: '0.55rem 1rem', color: '#fff', fontWeight: 700, cursor: selected && !feedback ? 'pointer' : 'default', fontSize: 13, opacity: selected && !feedback ? 1 : 0.4 }}>
                      {feedback === 'correct' ? '✓ Correct!' : feedback === 'wrong' ? '✗ New question incoming...' : 'Submit'}
                    </button>
                  </div>
                  {showHint && hintRevealed && <div style={{ ...st.card, marginTop: 7, borderColor: '#fbbf2428', background: '#fbbf2406', padding: '0.6rem 0.85rem' }}><p style={{ margin: 0, fontSize: 12, color: '#fde68a' }}>💡 {currentPuzzle.hint}</p></div>}
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
