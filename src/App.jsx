import { useState, useEffect, useRef } from 'react'
import { loginPlayer, loadProgress, saveProgress, loadAllProgress, subscribeToProgress } from './supabase.js'

// ─── Constants ────────────────────────────────────────────────────

const CHARACTERS = {
  charlotte: {
    name: 'Charlotte', age: 7, power: 'Heart Magic', color: '#38bdf8',
    avatar: '🌀',
    weapon: ['Wand of Hearts','Crystal Staff','Rainbow Scepter','Moonbeam Rod','Star Prism'],
    skill: ['Healing Touch','Petal Shield','Glow Aura','Spirit Song','Heartfire Burst'],
    puzzleStyle: 'age 7 child, use simple concepts: colors, counting to 20, short riddles, basic patterns, matching. Always 4 short answer choices.',
  },
  rileigh: {
    name: 'Rileigh', age: 13, power: 'Star Magic', color: '#a78bfa',
    avatar: '🌟',
    weapon: ['Starlight Wand','Celestial Staff','Nova Lance','Comet Blade','Eclipse Sword'],
    skill: ['Star Map','Gravity Pull','Void Step','Constellation Lock','Supernova Strike'],
    puzzleStyle: 'age 13 advanced student, use logic deduction, word puzzles, number sequences with tricky gaps, multi-step reasoning, vocabulary. Always 4 answer choices.',
  },
  margaux: {
    name: 'Margaux', age: 9, power: 'Storm Magic', color: '#fbbf24',
    avatar: '⚡',
    weapon: ['Thunder Wand','Storm Trident','Lightning Blade','Tempest Bow','Cyclone Gauntlet'],
    skill: ['Wind Dash','Thunder Clap','Storm Eye','Gale Force','Hurricane Fury'],
    puzzleStyle: 'age 9 sharp student, use memory challenges, arithmetic, pattern sequences, riddles, quick logic. Always 4 answer choices.',
  },
}

const CHAPTERS = [
  { title: 'The Whispering Forest', icon: '🌲', theme: 'an enchanted forest full of talking animals and ancient glowing trees', bg: ['#061a0e','#0d3320','#071410'], accent: '#22c55e' },
  { title: 'The Crystal Caves',     icon: '💎', theme: 'glittering underground caves filled with magical gems and echoing riddles', bg: ['#08061f','#180d45','#05030f'], accent: '#818cf8' },
  { title: 'The Sky Kingdom',       icon: '☁️', theme: 'a floating kingdom above the clouds ruled by wind spirits', bg: ['#030f1f','#072444','#020810'], accent: '#38bdf8' },
  { title: 'The Sunken Temple',     icon: '🏛️', theme: 'an ancient underwater temple with glowing runes and sea creatures', bg: ['#031218','#052e3e','#020c10'], accent: '#06b6d4' },
  { title: "The Shadow Queen's Lair", icon: '🌑', theme: 'the dark fortress of the Shadow Queen, the final challenge', bg: ['#0a0212','#1a052e','#050008'], accent: '#c084fc' },
]

const PUZZLE_TYPES = {
  charlotte: ['color or shape matching','simple counting or addition','short fun riddle','finish the pattern','spot the odd one out'],
  rileigh:   ['logic deduction puzzle','number sequence with explanation','challenging word riddle','multi-step math problem','vocabulary or synonym/antonym puzzle'],
  margaux:   ['memory or recall challenge','multiplication or division problem','medium riddle','number pattern sequence','spatial or ordering logic puzzle'],
}

// ─── Character SVGs (reused from game) ───────────────────────────

function CharlotteSVG({ chapter = 0 }) {
  const chap = CHAPTERS[chapter] || CHAPTERS[0]
  return (
    <svg viewBox="0 0 180 320" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="cBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={chap.bg[1]}/><stop offset="100%" stopColor={chap.bg[0]}/></linearGradient>
        <linearGradient id="cSkin" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d4956a"/><stop offset="100%" stopColor="#b5722a"/></linearGradient>
        <linearGradient id="cHair" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#1a0a02"/><stop offset="100%" stopColor="#3d1f08"/></linearGradient>
        <linearGradient id="cCoat" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0ea5e9"/><stop offset="100%" stopColor="#0369a1"/></linearGradient>
        <radialGradient id="cGlow" cx="50%" cy="60%" r="55%"><stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35"/><stop offset="100%" stopColor="#38bdf8" stopOpacity="0"/></radialGradient>
        <filter id="cBlur"><feGaussianBlur stdDeviation="4"/></filter>
      </defs>
      <rect width="180" height="320" fill="url(#cBg)" rx="14"/>
      {chapter===0&&<><path d="M0,260 Q30,240 60,255 Q90,268 130,250 Q160,238 180,255 L180,320 L0,320Z" fill="#061a0e" opacity="0.9"/><rect x="0" y="220" width="18" height="80" rx="4" fill="#052e10" opacity="0.8"/><rect x="160" y="230" width="20" height="70" rx="4" fill="#052e10" opacity="0.7"/></>}
      {chapter===1&&<><polygon points="0,320 28,220 56,320" fill="#1e1b6b" opacity="0.6"/><polygon points="130,320 158,210 180,320" fill="#1e1b6b" opacity="0.5"/></>}
      {chapter===2&&<><ellipse cx="40" cy="270" rx="38" ry="14" fill="white" opacity="0.08"/><ellipse cx="140" cy="260" rx="32" ry="12" fill="white" opacity="0.07"/></>}
      {chapter===3&&<><path d="M0,230 Q90,210 180,230 L180,320 L0,320Z" fill="#052e3e" opacity="0.5"/></>}
      {chapter===4&&<><path d="M60,280 L90,250 L120,280" fill="none" stroke="#7c3aed" strokeWidth="1.5" opacity="0.5"/></>}
      <ellipse cx="90" cy="190" rx="55" ry="70" fill="url(#cGlow)" filter="url(#cBlur)"/>
      <rect x="62" y="235" width="24" height="68" rx="5" fill="#1e3a8a"/><rect x="94" y="235" width="24" height="68" rx="5" fill="#1e3a8a"/>
      <rect x="58" y="288" width="30" height="18" rx="5" fill="#0f172a"/><rect x="92" y="288" width="30" height="18" rx="5" fill="#0f172a"/>
      <rect x="58" y="288" width="30" height="6" rx="2" fill="#1e293b"/><rect x="92" y="288" width="30" height="6" rx="2" fill="#1e293b"/>
      <path d="M55,160 L50,240 L80,242 L90,220 L100,242 L130,240 L125,160Z" fill="url(#cCoat)"/>
      <polygon points="90,162 78,180 90,175" fill="#0284c7"/><polygon points="90,162 102,180 90,175" fill="#0284c7"/>
      <line x1="90" y1="175" x2="90" y2="240" stroke="#0284c7" strokeWidth="1.5"/>
      <rect x="55" y="200" width="70" height="9" rx="3" fill="#1e293b"/><rect x="82" y="198" width="16" height="13" rx="2" fill="#334155"/><rect x="86" y="201" width="8" height="7" rx="1" fill="#38bdf8"/>
      <rect x="48" y="155" width="84" height="16" rx="5" fill="#0ea5e9"/>
      <path d="M50,160 Q30,175 24,205" stroke="#0ea5e9" strokeWidth="16" strokeLinecap="round" fill="none"/>
      <path d="M130,160 Q150,175 156,205" stroke="#0ea5e9" strokeWidth="16" strokeLinecap="round" fill="none"/>
      <path d="M24,205 Q20,220 22,235" stroke="#0369a1" strokeWidth="13" strokeLinecap="round" fill="none"/>
      <path d="M156,205 Q160,220 158,235" stroke="#0369a1" strokeWidth="13" strokeLinecap="round" fill="none"/>
      <ellipse cx="22" cy="238" rx="10" ry="11" fill="url(#cSkin)"/><ellipse cx="158" cy="238" rx="10" ry="11" fill="url(#cSkin)"/>
      <rect x="160" y="190" width="5" height="58" rx="2" fill="#e0f2fe"/>
      <path d="M162,188 C162,183 165,182 166,184 C167,182 170,183 170,188 C170,193 162,197 162,197Z" fill="#38bdf8" opacity="0.9"/>
      <circle cx="148" cy="178" r="3" fill="#38bdf8" opacity="0.8"/><circle cx="140" cy="168" r="2" fill="#7dd3fc" opacity="0.6"/>
      <rect x="80" y="136" width="20" height="22" rx="5" fill="url(#cSkin)"/>
      <ellipse cx="90" cy="118" rx="32" ry="34" fill="url(#cSkin)"/>
      <ellipse cx="78" cy="115" rx="9" ry="10" fill="white"/><ellipse cx="102" cy="115" rx="9" ry="10" fill="white"/>
      <ellipse cx="78" cy="117" rx="7" ry="8" fill="#1e6fa8"/><ellipse cx="102" cy="117" rx="7" ry="8" fill="#1e6fa8"/>
      <ellipse cx="78" cy="117" rx="5" ry="6" fill="#1d4ed8"/><ellipse cx="102" cy="117" rx="5" ry="6" fill="#1d4ed8"/>
      <ellipse cx="78" cy="117" rx="3" ry="3.5" fill="#1e3a8a"/><ellipse cx="102" cy="117" rx="3" ry="3.5" fill="#1e3a8a"/>
      <circle cx="81" cy="113" r="2.5" fill="white"/><circle cx="105" cy="113" r="2.5" fill="white"/>
      <path d="M69,110 Q78,105 87,110" stroke="#1a0a02" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M93,110 Q102,105 111,110" stroke="#1a0a02" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M67,103 Q78,97 88,103" stroke="#1a0a02" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M92,103 Q102,97 113,103" stroke="#1a0a02" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M87,122 L85,132 Q90,135 95,132 L93,122" stroke="#a0622a" strokeWidth="1.2" fill="none" opacity="0.6"/>
      <path d="M80,140 Q90,145 100,140" stroke="#c0705a" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M58,118 Q42,108 45,90 Q48,70 58,62 Q68,52 90,50 Q112,52 122,62 Q132,70 135,90 Q138,108 122,118" fill="url(#cHair)"/>
      <path d="M58,118 Q40,125 38,140 Q36,155 45,162" stroke="url(#cHair)" strokeWidth="12" fill="none" strokeLinecap="round"/>
      <path d="M122,118 Q140,125 142,140 Q144,155 135,162" stroke="url(#cHair)" strokeWidth="12" fill="none" strokeLinecap="round"/>
      <circle cx="52" cy="100" r="12" fill="url(#cHair)"/><circle cx="128" cy="100" r="12" fill="url(#cHair)"/>
      <polygon points="78,52 82,30 88,52" fill="url(#cHair)"/><polygon points="88,50 93,26 99,50" fill="url(#cHair)"/><polygon points="98,52 103,32 108,52" fill="url(#cHair)"/>
      <polygon points="118,72 120,66 122,72 128,72 123,76 125,82 120,78 115,82 117,76 112,72" fill="#f472b6" transform="scale(0.7) translate(52,30)"/>
      <ellipse cx="90" cy="308" rx="40" ry="9" fill="black" opacity="0.3"/>
    </svg>
  )
}

function RileighSVG({ chapter = 0 }) {
  const chap = CHAPTERS[chapter] || CHAPTERS[0]
  return (
    <svg viewBox="0 0 180 320" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="rBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={chap.bg[1]}/><stop offset="100%" stopColor={chap.bg[0]}/></linearGradient>
        <linearGradient id="rSkin" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d4956a"/><stop offset="100%" stopColor="#b5722a"/></linearGradient>
        <linearGradient id="rHair" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#0d0503"/><stop offset="100%" stopColor="#2d1208"/></linearGradient>
        <linearGradient id="rCoat" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1e2d5a"/><stop offset="100%" stopColor="#0f1730"/></linearGradient>
        <radialGradient id="rGlow" cx="50%" cy="55%" r="55%"><stop offset="0%" stopColor="#a78bfa" stopOpacity="0.35"/><stop offset="100%" stopColor="#a78bfa" stopOpacity="0"/></radialGradient>
        <filter id="rBlur"><feGaussianBlur stdDeviation="4"/></filter>
      </defs>
      <rect width="180" height="320" fill="url(#rBg)" rx="14"/>
      {chapter===0&&<><path d="M0,268 Q40,250 90,260 Q140,270 180,255 L180,320 L0,320Z" fill="#061a0e" opacity="0.85"/></>}
      {chapter===4&&<><path d="M55,285 L90,255 L125,285" fill="none" stroke="#7c3aed" strokeWidth="1.5" opacity="0.45"/></>}
      <ellipse cx="90" cy="195" rx="55" ry="75" fill="url(#rGlow)" filter="url(#rBlur)"/>
      <rect x="60" y="238" width="25" height="70" rx="5" fill="#0f172a"/><rect x="95" y="238" width="25" height="70" rx="5" fill="#0f172a"/>
      <rect x="56" y="285" width="31" height="22" rx="5" fill="#111827"/><rect x="93" y="285" width="31" height="22" rx="5" fill="#111827"/>
      <rect x="56" y="285" width="31" height="7" rx="3" fill="#1f2937"/><rect x="93" y="285" width="31" height="7" rx="3" fill="#1f2937"/>
      <path d="M48,158 L42,245 L75,247 L90,225 L105,247 L138,245 L132,158Z" fill="url(#rCoat)"/>
      <line x1="90" y1="172" x2="90" y2="245" stroke="#2d3f6b" strokeWidth="1.5"/>
      <polygon points="90,165 72,185 90,178" fill="#263355"/><polygon points="90,165 108,185 90,178" fill="#263355"/>
      <circle cx="90" cy="192" r="3" fill="#d97706"/><circle cx="90" cy="208" r="3" fill="#d97706"/><circle cx="90" cy="224" r="3" fill="#d97706"/>
      <rect x="50" y="200" width="80" height="10" rx="3" fill="#292524"/><rect x="82" y="198" width="16" height="14" rx="2" fill="#44403c"/><rect x="86" y="202" width="8" height="6" rx="1" fill="#a78bfa"/>
      <rect x="44" y="152" width="92" height="14" rx="5" fill="#263355"/>
      <rect x="80" y="152" width="20" height="14" rx="3" fill="#e2e8f0"/>
      <path d="M48,162 Q26,178 20,210" stroke="#1e2d5a" strokeWidth="18" strokeLinecap="round" fill="none"/>
      <path d="M132,162 Q154,178 160,210" stroke="#1e2d5a" strokeWidth="18" strokeLinecap="round" fill="none"/>
      <path d="M20,210 Q16,228 18,242" stroke="#0f172a" strokeWidth="14" strokeLinecap="round" fill="none"/>
      <path d="M160,210 Q164,228 162,242" stroke="#0f172a" strokeWidth="14" strokeLinecap="round" fill="none"/>
      <ellipse cx="18" cy="246" rx="11" ry="12" fill="url(#rSkin)"/><ellipse cx="162" cy="246" rx="11" ry="12" fill="url(#rSkin)"/>
      <rect x="164" y="155" width="5" height="75" rx="2" fill="#c4b5fd"/>
      <rect x="157" y="145" width="19" height="5" rx="2" fill="#7c3aed"/>
      <circle cx="166" cy="142" r="9" fill="#a78bfa"/><circle cx="166" cy="142" r="5" fill="#7c3aed"/><circle cx="166" cy="142" r="3" fill="#e879f9"/>
      <circle cx="152" cy="135" r="2.5" fill="#a78bfa" opacity="0.8"/><circle cx="144" cy="126" r="2" fill="#c4b5fd" opacity="0.6"/>
      <rect x="80" y="136" width="20" height="20" rx="5" fill="url(#rSkin)"/>
      <ellipse cx="90" cy="116" rx="33" ry="35" fill="url(#rSkin)"/>
      <ellipse cx="77" cy="114" rx="10" ry="9" fill="white"/><ellipse cx="103" cy="114" rx="10" ry="9" fill="white"/>
      <ellipse cx="77" cy="115" rx="7" ry="7.5" fill="#5b21b6"/><ellipse cx="103" cy="115" rx="7" ry="7.5" fill="#5b21b6"/>
      <ellipse cx="77" cy="115" rx="4.5" ry="5" fill="#3b0764"/><ellipse cx="103" cy="115" rx="4.5" ry="5" fill="#3b0764"/>
      <circle cx="80" cy="111" r="2.5" fill="white"/><circle cx="106" cy="111" r="2.5" fill="white"/>
      <path d="M67,108 Q77,102 87,108" stroke="#0d0503" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M93,108 Q103,102 113,108" stroke="#0d0503" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M65,100 Q77,93 88,99" stroke="#0d0503" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <path d="M92,99 Q103,93 115,100" stroke="#0d0503" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <path d="M87,121 L85,131 Q90,134 95,131 L93,121" stroke="#a0622a" strokeWidth="1.2" fill="none" opacity="0.55"/>
      <path d="M81,140 Q90,143 99,140" stroke="#c0705a" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M57,116 Q38,105 40,82 Q42,58 57,48 Q68,40 90,38 Q112,40 123,48 Q138,58 140,82 Q142,105 123,116" fill="url(#rHair)"/>
      <path d="M57,116 Q42,140 38,170 Q34,198 36,220 Q38,238 40,255" stroke="url(#rHair)" strokeWidth="11" fill="none" strokeLinecap="round"/>
      {[135,150,165,180,195,210,225].map((y,i)=><ellipse key={i} cx={45-(i%2)*3} cy={y} rx="6" ry="4" fill="#1a0805" opacity="0.5"/>)}
      <path d="M123,116 Q138,140 142,170 Q146,198 144,220 Q142,238 140,255" stroke="url(#rHair)" strokeWidth="11" fill="none" strokeLinecap="round"/>
      {[135,150,165,180,195,210,225].map((y,i)=><ellipse key={i} cx={135+(i%2)*3} cy={y} rx="6" ry="4" fill="#1a0805" opacity="0.5"/>)}
      <rect x="33" y="252" width="14" height="6" rx="3" fill="#3b82f6"/><rect x="133" y="252" width="14" height="6" rx="3" fill="#3b82f6"/>
      <path d="M57,78 Q62,60 90,56 Q118,60 123,78" fill="url(#rHair)"/>
      <ellipse cx="90" cy="308" rx="42" ry="9" fill="black" opacity="0.28"/>
    </svg>
  )
}

function MargauxSVG({ chapter = 0 }) {
  const chap = CHAPTERS[chapter] || CHAPTERS[0]
  return (
    <svg viewBox="0 0 180 320" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="mBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={chap.bg[1]}/><stop offset="100%" stopColor={chap.bg[0]}/></linearGradient>
        <linearGradient id="mSkin" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c8814e"/><stop offset="100%" stopColor="#a5601e"/></linearGradient>
        <linearGradient id="mHair" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#0a0301"/><stop offset="100%" stopColor="#1a0803"/></linearGradient>
        <linearGradient id="mJacket" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d97706"/><stop offset="100%" stopColor="#92400e"/></linearGradient>
        <radialGradient id="mGlow" cx="50%" cy="55%" r="55%"><stop offset="0%" stopColor="#fbbf24" stopOpacity="0.4"/><stop offset="100%" stopColor="#fbbf24" stopOpacity="0"/></radialGradient>
        <filter id="mBlur"><feGaussianBlur stdDeviation="4"/></filter>
      </defs>
      <rect width="180" height="320" fill="url(#mBg)" rx="14"/>
      {chapter===0&&<><path d="M0,265 Q40,248 90,258 Q140,268 180,252 L180,320 L0,320Z" fill="#061a0e" opacity="0.85"/></>}
      {chapter===4&&<><path d="M52,282 L90,252 L128,282" fill="none" stroke="#7c3aed" strokeWidth="1.5" opacity="0.45"/></>}
      <ellipse cx="90" cy="195" rx="55" ry="72" fill="url(#mGlow)" filter="url(#mBlur)"/>
      <rect x="60" y="230" width="26" height="72" rx="5" fill="#1f2937"/><rect x="94" y="230" width="26" height="72" rx="5" fill="#1f2937"/>
      <rect x="58" y="228" width="30" height="30" rx="4" fill="#db2777"/><rect x="92" y="228" width="30" height="30" rx="4" fill="#1d4ed8"/>
      <rect x="55" y="286" width="33" height="22" rx="5" fill="#111827"/><rect x="92" y="286" width="33" height="22" rx="5" fill="#111827"/>
      <rect x="55" y="286" width="33" height="7" rx="3" fill="#1f2937"/><rect x="92" y="286" width="33" height="7" rx="3" fill="#1f2937"/>
      <rect x="58" y="295" width="22" height="4" rx="2" fill="#d97706"/><rect x="95" y="295" width="22" height="4" rx="2" fill="#d97706"/>
      <path d="M50,155 L44,235 L78,237 L90,215 L102,237 L136,235 L130,155Z" fill="url(#mJacket)"/>
      <line x1="90" y1="168" x2="90" y2="235" stroke="#92400e" strokeWidth="1.5"/>
      <rect x="50" y="155" width="80" height="10" rx="3" fill="#b45309"/>
      <rect x="76" y="215" width="28" height="12" rx="3" fill="#f1f5f9"/>
      <rect x="50" y="205" width="80" height="9" rx="3" fill="#1c1917"/><rect x="82" y="203" width="16" height="13" rx="2" fill="#292524"/><rect x="86" y="207" width="8" height="5" rx="1" fill="#fbbf24"/>
      <path d="M50,160 Q28,172 18,198" stroke="url(#mJacket)" strokeWidth="18" strokeLinecap="round" fill="none"/>
      <path d="M130,160 Q152,165 162,188" stroke="url(#mJacket)" strokeWidth="18" strokeLinecap="round" fill="none"/>
      <path d="M18,198 Q10,215 14,232" stroke="#92400e" strokeWidth="14" strokeLinecap="round" fill="none"/>
      <path d="M162,188 Q168,205 165,225" stroke="#92400e" strokeWidth="14" strokeLinecap="round" fill="none"/>
      <ellipse cx="14" cy="236" rx="11" ry="12" fill="url(#mSkin)" transform="rotate(-15 14 236)"/>
      <ellipse cx="165" cy="228" rx="11" ry="12" fill="url(#mSkin)" transform="rotate(10 165 228)"/>
      <path d="M168,175 L180,205 L173,200 L178,225" stroke="#fbbf24" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <path d="M168,175 L156,205 L163,200 L158,225" stroke="#fbbf24" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <circle cx="169" cy="172" r="7" fill="#f59e0b"/><circle cx="169" cy="172" r="4" fill="#fde68a"/>
      <path d="M152,165 L158,172 L152,170 L158,178" stroke="#fbbf24" strokeWidth="2" fill="none" opacity="0.8"/>
      <rect x="80" y="133" width="20" height="24" rx="5" fill="url(#mSkin)"/>
      <ellipse cx="90" cy="112" rx="33" ry="34" fill="url(#mSkin)"/>
      <ellipse cx="77" cy="112" rx="10" ry="8" fill="white"/><ellipse cx="103" cy="112" rx="10" ry="8" fill="white"/>
      <ellipse cx="77" cy="113" rx="7" ry="6.5" fill="#92400e"/><ellipse cx="103" cy="113" rx="7" ry="6.5" fill="#92400e"/>
      <ellipse cx="77" cy="113" rx="4.5" ry="4.5" fill="#451a03"/><ellipse cx="103" cy="113" rx="4.5" ry="4.5" fill="#451a03"/>
      <circle cx="80" cy="109" r="2.5" fill="white"/><circle cx="106" cy="109" r="2.5" fill="white"/>
      <path d="M67,110 Q77,107 87,110" stroke="#0a0301" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M93,110 Q103,107 113,110" stroke="#0a0301" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M67,116 Q77,119 87,116" stroke="#0a0301" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M93,116 Q103,119 113,116" stroke="#0a0301" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M65,101 Q77,94 88,100" stroke="#0a0301" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <path d="M92,100 Q103,94 115,101" stroke="#0a0301" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <path d="M84,103 Q90,100 96,103" stroke="#0a0301" strokeWidth="2" fill="none" opacity="0.5"/>
      <path d="M87,119 L85,129 Q90,132 95,129 L93,119" stroke="#a0622a" strokeWidth="1.2" fill="none" opacity="0.55"/>
      <path d="M82,137 Q92,141 100,137" stroke="#c0705a" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <ellipse cx="90" cy="90" rx="28" ry="26" fill="url(#mHair)"/>
      <ellipse cx="60" cy="112" rx="10" ry="14" fill="url(#mHair)"/><ellipse cx="120" cy="112" rx="10" ry="14" fill="url(#mHair)"/>
      <polygon points="75,76 79,50 84,76" fill="url(#mHair)"/><polygon points="83,73 88,44 94,73" fill="url(#mHair)"/><polygon points="93,73 98,48 103,73" fill="url(#mHair)"/>
      <polygon points="68,80 70,58 76,80" fill="url(#mHair)"/><polygon points="102,80 106,60 110,80" fill="url(#mHair)"/>
      <circle cx="90" cy="72" r="14" fill="url(#mHair)"/><circle cx="90" cy="72" r="8" fill="#1a0803"/>
      <ellipse cx="90" cy="64" rx="10" ry="4" fill="#db2777"/><ellipse cx="90" cy="64" rx="6" ry="2.5" fill="#f472b6"/>
      <ellipse cx="90" cy="309" rx="42" ry="9" fill="black" opacity="0.28"/>
    </svg>
  )
}

function SceneSVG({ chapter, puzzleIdx, playerName }) {
  const chap = CHAPTERS[chapter] || CHAPTERS[0]
  const ch = CHARACTERS[playerName]
  const total = PUZZLE_TYPES[playerName].length
  return (
    <svg viewBox="0 0 320 110" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', borderRadius: 10 }}>
      <defs>
        <linearGradient id={`sg${chapter}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={chap.bg[0]}/><stop offset="50%" stopColor={chap.bg[1]}/><stop offset="100%" stopColor={chap.bg[0]}/>
        </linearGradient>
        <radialGradient id={`sr${chapter}`} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={chap.accent} stopOpacity="0.18"/><stop offset="100%" stopColor={chap.accent} stopOpacity="0"/>
        </radialGradient>
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

// ─── PIN Login Screen ─────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const [selectedChar, setSelectedChar] = useState(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const chars = Object.keys(CHARACTERS)

  async function handleLogin() {
    if (!selectedChar || pin.length < 4) return
    setLoading(true); setError('')
    const ch = CHARACTERS[selectedChar]
    const { player, error: err } = await loginPlayer(ch.name, pin)
    if (err) { setError(err); setLoading(false); return }
    const progress = await loadProgress(player.id)
    onLogin(player, progress)
    setLoading(false)
  }

  const st = {
    bg: { minHeight: '100vh', background: 'linear-gradient(135deg,#0a0820,#1a0f3a,#0d0618)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'system-ui,sans-serif', color: '#fff' },
    card: { background: 'rgba(255,255,255,0.07)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.12)', padding: '2rem', width: '100%', maxWidth: 420 },
    charBtn: (name) => ({ background: selectedChar === name ? `${CHARACTERS[name].color}25` : 'rgba(255,255,255,0.05)', border: `2px solid ${selectedChar === name ? CHARACTERS[name].color : 'rgba(255,255,255,0.12)'}`, borderRadius: 16, padding: '0.75rem 0.5rem', cursor: 'pointer', flex: 1, transition: 'all 0.18s' }),
    pinBtn: (n) => ({ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '0.85rem', fontSize: 20, fontWeight: 700, color: '#fff', cursor: 'pointer', flex: 1 }),
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
            const SVG = name === 'charlotte' ? CharlotteSVG : name === 'rileigh' ? RileighSVG : MargauxSVG
            return (
              <button key={name} style={st.charBtn(name)} onClick={() => { setSelectedChar(name); setPin(''); setError('') }}>
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
              {[1,2,3,4,5,6,7,8,9].map(n => (
                <button key={n} style={st.pinBtn(n)} onClick={() => pin.length < 4 && setPin(p => p + n)}>{n}</button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: '1.25rem' }}>
              <div/>
              <button style={st.pinBtn(0)} onClick={() => pin.length < 4 && setPin(p => p + '0')}>0</button>
              <button style={{ ...st.pinBtn('del'), background: 'rgba(255,255,255,0.05)' }} onClick={() => setPin(p => p.slice(0, -1))}>⌫</button>
            </div>
            {error && <p style={{ color: '#f87171', fontSize: 13, textAlign: 'center', marginBottom: 10 }}>{error}</p>}
            <button
              onClick={handleLogin}
              disabled={pin.length < 4 || loading}
              style={{ width: '100%', background: pin.length === 4 && !loading ? CHARACTERS[selectedChar].color : 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 12, padding: '0.85rem', color: '#fff', fontWeight: 700, fontSize: 16, cursor: pin.length === 4 ? 'pointer' : 'default', opacity: pin.length === 4 ? 1 : 0.4, transition: 'all 0.18s' }}>
              {loading ? 'Entering the realm...' : `Enter as ${CHARACTERS[selectedChar].name} ✨`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────

export default function App() {
  const [session, setSession] = useState(null)       // { player, character }
  const [progress, setProgress] = useState(null)     // db progress row
  const [allProgress, setAllProgress] = useState([]) // all 3 players for rivals
  const [currentPuzzle, setCurrentPuzzle] = useState(null)
  const [selected, setSelected] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [showHint, setShowHint] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [chapterComplete, setChapterComplete] = useState(false)
  const [showSiblings, setShowSiblings] = useState(false)
  const timerRef = useRef(null)
  const channelRef = useRef(null)

  // Load all progress + subscribe to realtime on login
  useEffect(() => {
    if (!session) return
    loadAllProgress().then(setAllProgress)
    channelRef.current = subscribeToProgress(payload => {
      setAllProgress(prev => prev.map(r => r.id === payload.new.id ? { ...r, ...payload.new } : r))
      if (payload.new.player_id === session.player.id) setProgress(prev => ({ ...prev, ...payload.new }))
    })
    return () => { channelRef.current?.unsubscribe() }
  }, [session])

  function handleLogin(player, prog) {
    setSession({ player, character: player.character })
    setProgress(prog)
    generatePuzzle(player.character, prog.chapter, prog.puzzle, prog.difficulty)
  }

  function handleLogout() {
    clearTimeout(timerRef.current)
    channelRef.current?.unsubscribe()
    setSession(null); setProgress(null); setAllProgress([])
    setCurrentPuzzle(null); setSelected(null); setFeedback(null)
    setShowHint(false); setChapterComplete(false); setError('')
  }

  async function persistProgress(updates) {
    const merged = { ...progress, ...updates }
    setProgress(merged)
    await saveProgress(session.player.id, {
      chapter: merged.chapter,
      puzzle: merged.puzzle,
      score: merged.score,
      streak: merged.streak,
      difficulty: merged.difficulty,
      completed_chapters: merged.completed_chapters,
      items: merged.items,
      skills: merged.skills,
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
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 1000,
          messages: [{ role: 'user', content: `You are a puzzle generator for "The Enchanted Realm: Sisters of Magic".
Generate a UNIQUE puzzle:
- Player: ${ch.name}, age ${ch.age}, power: ${ch.power}
- Chapter: "${chap.title}" — ${chap.theme}
- Puzzle type: ${pType} — Difficulty: ${diffLabel}
- Age guidance: ${ch.puzzleStyle}
Rules: fit the fantasy setting, frame as ${ch.name}'s challenge, be original with numbers/words/logic.
Respond ONLY valid JSON no markdown:
{"narration":"2-sentence story setup max 35 words mentioning ${ch.name}","question":"puzzle question 1-3 sentences","options":["correct answer","wrong 2","wrong 3","wrong 4"],"answer":"exact correct answer text","hint":"helpful hint 1 sentence"}` }]
        })
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
    const p = session.character
    const streak = correct ? progress.streak + 1 : 0
    const difficulty = correct
      ? (streak >= 3 ? Math.min(3, progress.difficulty + 1) : progress.difficulty)
      : Math.max(1, progress.difficulty - 1)
    const score = progress.score + (correct ? 100 + (progress.streak * 10) - (showHint ? 20 : 0) : 0)
    await persistProgress({ score, streak, difficulty })

    timerRef.current = setTimeout(async () => {
      if (correct) {
        const isLast = progress.puzzle >= PUZZLE_TYPES[p].length - 1
        if (isLast) {
          const ch = CHARACTERS[p]
          const newChapter = Math.min(progress.chapter + 1, CHAPTERS.length - 1)
          const newItems = [...progress.items, ch.weapon[Math.min(progress.chapter + 1, 4)]]
          const newSkills = [...progress.skills, ch.skill[Math.min(progress.chapter + 1, 4)]]
          const newCompleted = [...progress.completed_chapters, progress.chapter]
          await persistProgress({ chapter: newChapter, puzzle: 0, completed_chapters: newCompleted, items: newItems, skills: newSkills })
          setChapterComplete(true)
        } else {
          const next = progress.puzzle + 1
          await persistProgress({ puzzle: next })
          generatePuzzle(p, progress.chapter, next, difficulty)
        }
      } else { setSelected(null); setFeedback(null) }
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
  const CharSVG = p === 'charlotte' ? CharlotteSVG : p === 'rileigh' ? RileighSVG : MargauxSVG
  const totalPuzzles = PUZZLE_TYPES[p].length * CHAPTERS.length
  const completedPuzzles = (progress.completed_chapters.length * PUZZLE_TYPES[p].length) + progress.puzzle
  const progressPct = Math.round((completedPuzzles / totalPuzzles) * 100)
  const others = allProgress.filter(r => r.character !== p)
  const chapDone = progress.completed_chapters.length

  const st = {
    bg: { minHeight: '100vh', background: 'linear-gradient(135deg,#0a0820,#1a0f3a,#0d0618)', padding: 0, fontFamily: 'system-ui,sans-serif', color: '#fff' },
    card: { background: 'rgba(255,255,255,0.06)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', padding: '1rem' },
    opt: (col, active, ok, bad) => ({ background: ok ? '#16a34a22' : bad ? '#dc262622' : active ? `${col}22` : 'rgba(255,255,255,0.04)', border: `1.5px solid ${ok ? '#16a34a' : bad ? '#dc2626' : active ? col : 'rgba(255,255,255,0.12)'}`, borderRadius: 10, padding: '0.6rem 0.85rem', cursor: feedback ? 'default' : 'pointer', color: '#fff', fontSize: 13, textAlign: 'left', width: '100%', marginBottom: 7, fontWeight: active ? 600 : 400, transition: 'all 0.18s' }),
  }

  return (
    <div style={st.bg}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0.75rem' }}>
        {/* top bar */}
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
          <button onClick={() => setShowSiblings(x => !x)} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '5px 9px', color: '#fff', cursor: 'pointer', fontSize: 11 }}>👀 Rivals</button>
        </div>

        {showSiblings && (
          <div style={{ ...st.card, marginBottom: '0.75rem' }}>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>Live Rival Progress</p>
            {others.length === 0 && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Rivals haven't logged in yet!</p>}
            {others.map(r => {
              const och = CHARACTERS[r.character]
              if (!och) return null
              const opct = Math.round(((r.completed_chapters.length * PUZZLE_TYPES[r.character].length + r.puzzle) / (PUZZLE_TYPES[r.character].length * CHAPTERS.length)) * 100)
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 15 }}>{och.avatar}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span>{och.name}</span><span style={{ color: och.color }}>{r.score.toLocaleString()} pts</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 3, height: 3, marginTop: 2, overflow: 'hidden' }}>
                      <div style={{ background: och.color, width: `${opct}%`, height: '100%', borderRadius: 3 }}/>
                    </div>
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
              <button onClick={continueAfterChapter} style={{ background: char.color, border: 'none', borderRadius: 11, padding: '0.7rem 1.8rem', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
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
                  <div style={{ marginBottom: 8 }}>
                    <SceneSVG chapter={progress.chapter} puzzleIdx={progress.puzzle} playerName={p}/>
                  </div>
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
                      return <button key={opt} onClick={() => { if (!feedback) setSelected(opt) }} style={st.opt(char.color, isSel, isOk, isBad)}>{opt}</button>
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <button onClick={() => setShowHint(x => !x)} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '0.55rem', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: 12 }}>{showHint ? 'Hide' : '💡 Hint'}</button>
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
