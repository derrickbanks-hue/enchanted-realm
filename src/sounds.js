// Web Audio API sound engine — no external files needed

let ctx = null
let musicNode = null
let musicGain = null
let muted = false

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  return ctx
}

export function setMuted(val) {
  muted = val
  if (musicGain) musicGain.gain.setTargetAtTime(muted ? 0 : 0.18, getCtx().currentTime, 0.3)
}

export function isMuted() { return muted }

// ── Sound effects ──────────────────────────────────────────────────

function playTone(freq, type, duration, gainVal, delay = 0) {
  if (muted) return
  const c = getCtx()
  const o = c.createOscillator()
  const g = c.createGain()
  o.connect(g); g.connect(c.destination)
  o.type = type
  o.frequency.setValueAtTime(freq, c.currentTime + delay)
  g.gain.setValueAtTime(0, c.currentTime + delay)
  g.gain.linearRampToValueAtTime(gainVal, c.currentTime + delay + 0.01)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration)
  o.start(c.currentTime + delay)
  o.stop(c.currentTime + delay + duration)
}

export function playCorrect() {
  playTone(523, 'sine', 0.15, 0.4)
  playTone(659, 'sine', 0.15, 0.4, 0.1)
  playTone(784, 'sine', 0.25, 0.4, 0.2)
}

export function playWrong() {
  playTone(300, 'sawtooth', 0.1, 0.3)
  playTone(250, 'sawtooth', 0.2, 0.3, 0.1)
}

export function playClick() {
  playTone(440, 'sine', 0.08, 0.2)
}

export function playLevelUp() {
  [523, 587, 659, 698, 784, 880].forEach((f, i) => {
    playTone(f, 'sine', 0.18, 0.35, i * 0.08)
  })
}

export function playChapterComplete() {
  const melody = [523, 659, 784, 1047, 784, 1047, 1175]
  melody.forEach((f, i) => playTone(f, 'sine', 0.22, 0.4, i * 0.1))
}

export function playConfetti() {
  for (let i = 0; i < 8; i++) {
    const freq = 400 + Math.random() * 600
    playTone(freq, 'sine', 0.15, 0.25, i * 0.07)
  }
}

// ── Background music ───────────────────────────────────────────────
// Simple arpeggiated fantasy theme using oscillators

export function startMusic() {
  if (musicNode) return
  const c = getCtx()
  musicGain = c.createGain()
  musicGain.gain.value = muted ? 0 : 0.18
  musicGain.connect(c.destination)

  const notes = [261, 329, 392, 329, 293, 349, 440, 349, 246, 311, 392, 311]
  let step = 0

  function playNext() {
    if (!musicNode) return
    const o = c.createOscillator()
    const g = c.createGain()
    o.connect(g); g.connect(musicGain)
    o.type = 'sine'
    o.frequency.value = notes[step % notes.length]
    g.gain.setValueAtTime(0, c.currentTime)
    g.gain.linearRampToValueAtTime(0.6, c.currentTime + 0.05)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.45)
    o.start(c.currentTime)
    o.stop(c.currentTime + 0.5)
    step++
    musicNode = setTimeout(playNext, 480)
  }

  musicNode = setTimeout(playNext, 0)
  playNext()
}

export function stopMusic() {
  if (musicNode) { clearTimeout(musicNode); musicNode = null }
  if (musicGain) { musicGain.disconnect(); musicGain = null }
}
