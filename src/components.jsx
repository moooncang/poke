import { useEffect, useRef } from 'react';
import { X, Sparkles, ArrowRight, Volume2, VolumeX } from 'lucide-react';
import pokemon from './data/pokemon.json';
import { NPCS } from './data/world.js';

export const POKEMON = Object.fromEntries(pokemon.map(p => [p.id, p]));
export const sprite = (id, shiny = false) => `/assets/pokemon/${shiny ? 'shiny' : 'front'}/${id}.png`;
export const artwork = id => `/assets/pokemon/artwork/${id}.png`;

export function PokeBall({ className = '' }) {
  return <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M3 12h18" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="3" fill="var(--ball-fill, #f6f5ed)" stroke="currentColor" strokeWidth="1.6"/></svg>;
}

export function Landscape({ partner = 133, name = '태초마을' }) {
  return <div className="landscape" role="img" aria-label={`${name}의 숲과 작은 집, 포켓몬이 있는 풍경`}>
    <svg viewBox="0 0 720 310" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x2="0" y2="1"><stop stopColor="#c0dac4"/><stop offset="1" stopColor="#e6edbd"/></linearGradient>
        <linearGradient id="grass" x2="0" y2="1"><stop stopColor="#b1cb7d"/><stop offset="1" stopColor="#74985c"/></linearGradient>
        <pattern id="grain" width="13" height="13" patternUnits="userSpaceOnUse"><rect x="1" y="1" width="2" height="2" fill="#edf0b5" opacity=".2"/></pattern>
        <g id="pine"><rect x="13" y="30" width="7" height="26" fill="#756b40"/><path d="M16 0 0 25h6L0 40h33l-7-15h6Z" fill="#48765b"/><path d="m16 0-8 25h8L7 40h9Z" fill="#689367"/></g>
        <g id="tree"><rect x="18" y="26" width="9" height="29" fill="#81734a"/><path d="M9 4h23v5h10v10h5v18H0V19h5V9h4Z" fill="#467553"/><path d="M9 4h23v5h5v9H5V9h4Z" fill="#7ea269"/><path d="M0 28h47v9H0Z" fill="#386548"/></g>
        <g id="flower"><path d="M2 6v6" stroke="#5f8551" strokeWidth="2"/><rect width="5" height="5" fill="#faf0b8"/><rect x="2" y="2" width="2" height="2" fill="#d69c55"/></g>
      </defs>
      <rect width="720" height="310" fill="url(#sky)"/>
      <circle cx="538" cy="65" r="29" fill="#f6edb5" opacity=".8"/>
      <g fill="#edf0d4" opacity=".7"><path d="M83 43h34v-8h38v8h30v12H69V43Z"/><path d="M379 23h38v-8h25v8h25v10H367V23Z"/><path d="M586 89h29v-8h37v8h26v10h-104V89Z"/></g>
      <path d="M0 145 54 126h25l24-17h50l43 20h45l48-42h45l48 32h31l40-18h45l57 34h40l34-26h27l74 40v85H0Z" fill="#a0bba0"/>
      <path d="m0 177 46-25h57l48-22h39l61 35 38-12h44l35-27h45l62 33h43l49-15h64l89 38v98H0Z" fill="#82a77e"/>
      <rect y="196" width="720" height="114" fill="url(#grass)"/>
      <path d="M720 166H609v24h-50v30h-32v28h-28v25h-38v37h259Z" fill="#8bb8b4"/>
      <path d="M720 177H619v24h-47v27h-32v28h-29v25h-41" fill="none" stroke="#d7e6c5" strokeWidth="6"/>
      <g stroke="#c3d7be" strokeWidth="3" opacity=".8"><path d="M630 221h37m-60 13h24m9 30h42m-119 21h34m87-94h24"/></g>
      <path d="M341 207h58v40h39v28h41v35H329v-31h-24v-22h36Z" fill="#d6c394"/>
      <path d="M341 223h58m-75 45h40m22 29h54" stroke="#e7d6a7" strokeWidth="4"/>
      {[[-8,147,1.6],[45,138,1.4],[94,154,1.25],[139,134,1.5],[203,150,1.25],[480,128,1.15],[524,147,1],[556,119,1.35],[613,134,1.2],[656,123,1.5],[698,144,1.5]].map(([x,y,s],i)=><use key={i} href="#pine" transform={`translate(${x} ${y}) scale(${s})`}/>)}
      <g><rect x="321" y="132" width="93" height="82" fill="#ede2b3"/><rect x="321" y="192" width="93" height="22" fill="#ccbc8d"/><path d="M308 139v-10h10v-10h12v-10h14V98h49v11h13v10h12v10h10v10Z" fill="#aa7560"/><path d="M312 132h111m-99-13h86m-72-11h58" stroke="#c99772" strokeWidth="4"/><rect x="385" y="81" width="14" height="30" fill="#aa8d6d"/><rect x="382" y="78" width="20" height="7" fill="#c1a181"/><rect x="354" y="174" width="25" height="40" fill="#7d8767"/><rect x="360" y="178" width="14" height="21" fill="#adb898"/><rect x="331" y="157" width="18" height="19" fill="#8baba2"/><rect x="389" y="157" width="16" height="19" fill="#8baba2"/><path d="M331 166h18m-9-9v19m49-10h16m-8-9v19" stroke="#f0e5bb" strokeWidth="2"/></g>
      <g fill="#efe4b9"><rect x="242" y="204" width="6" height="28"/><rect x="270" y="204" width="6" height="28"/><rect x="298" y="204" width="6" height="28"/><rect x="242" y="211" width="64" height="5"/><rect x="242" y="222" width="64" height="5"/><rect x="432" y="205" width="6" height="27"/><rect x="460" y="205" width="6" height="27"/><rect x="431" y="212" width="39" height="5"/><rect x="431" y="223" width="39" height="5"/></g>
      <use href="#tree" transform="translate(220 183) scale(1.3)"/><use href="#tree" transform="translate(85 208) scale(1.5)"/><use href="#tree" transform="translate(156 242) scale(1.5)"/><use href="#tree" transform="translate(596 250) scale(1.8)"/><use href="#tree" transform="translate(20 252) scale(1.5)"/>
      {[[188,232],[204,221],[291,238],[450,239],[466,246],[317,287],[261,267],[492,285],[152,234],[67,238]].map(([x,y],i)=><use key={i} href="#flower" x={x} y={y}/>)}
      <rect y="195" width="720" height="115" fill="url(#grain)"/>
      <g transform="translate(361 238)"><rect x="3" width="12" height="5" fill="#964f43"/><rect y="5" width="18" height="4" fill="#b16c51"/><rect x="4" y="9" width="10" height="8" fill="#e8c89c"/><rect x="2" y="17" width="14" height="12" fill="#e3d598"/><rect x="6" y="16" width="9" height="10" fill="#56654c"/><rect x="3" y="29" width="5" height="5" fill="#485748"/><rect x="11" y="29" width="5" height="5" fill="#485748"/></g>
    </svg>
    <img className="scene-pokemon" src={sprite(partner)} alt=""/><span className="scene-firefly one"/><span className="scene-firefly two"/>
    <span className="scene-label"><i/> {name}의 어느 오후</span>
  </div>;
}

export function Modal({ title, onClose, children, className = '', labelledBy }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    const selector = 'button:not([disabled]), input, select, textarea, a[href], [tabindex="0"]';
    const focusables = () => [...dialog.querySelectorAll(selector)].filter(el => el.getClientRects().length);
    (focusables()[0] || dialog).focus();
    const listener = event => {
      if (event.key === 'Escape') closeRef.current?.();
      if (event.key === 'Tab') {
        const els = focusables();
        if (!els.length) { event.preventDefault(); return; }
        const first = els[0], last = els[els.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', listener);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', listener); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <div className={`modal-backdrop ${className}`} onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}>
    <section ref={ref} className="modal" role="dialog" aria-modal="true" aria-label={labelledBy ? undefined : title} aria-labelledby={labelledBy} tabIndex={-1}>
      {onClose && <button className="modal-close icon-button" onClick={onClose} aria-label="닫기"><X size={21}/></button>}{children}
    </section>
  </div>;
}

let audioContext;
export function playChime(type = 'partner') {
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume().then(() => {
      const frequencies = type === 'legendary' ? [220, 329.63, 440, 659.25, 880] : [392, 493.88, 587.33, 783.99];
      frequencies.forEach((frequency, i) => {
        const osc = audioContext.createOscillator(), gain = audioContext.createGain();
        const start = audioContext.currentTime + i * .19;
        osc.type = 'sine'; osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.055, start + .08); gain.gain.exponentialRampToValueAtTime(.001, start + 1.6);
        osc.connect(gain); gain.connect(audioContext.destination); osc.start(start); osc.stop(start + 1.7);
      });
    }).catch(() => {});
  } catch { /* Audio is optional; simulation never depends on it. */ }
}

export function Encounter({ data, age, onClose, sound, toggleSound, replay = false }) {
  const creature = POKEMON[data.pokemonId];
  const person = NPCS[data.npc];
  const name = person?.name || creature?.name;
  const chimed = useRef(false);
  useEffect(() => { if (sound && !chimed.current) { chimed.current = true; playChime(data.type); } }, [data.logId]);
  const isLegend = data.type === 'legendary';
  const label = { legendary: creature?.mythical ? '환상의 만남' : '전설과 마주하다', shiny: '색이 다른 포켓몬', npc: '운명 같은 인연', partner: '우리의 첫 만남', evolution: '함께 자라는 시간' }[data.type];
  return <Modal title={`${label}: ${name}`} onClose={onClose} className={`encounter-backdrop ${data.type}`}>
    <div className="cinema-grain"/>
    <div className="cinema-top"><span>POKÉLIFE <b>·</b> {replay ? 'MEMORY' : `${age} YEARS`}</span><button className="icon-button" onClick={toggleSound} aria-label={sound ? '소리 끄기' : '소리 켜기'}>{sound ? <Volume2 size={18}/> : <VolumeX size={18}/>}</button></div>
    <div className="encounter-stars" aria-hidden="true">{Array.from({length: 24}, (_, i) => <i key={i} style={{'--i': i, left: `${(i * 37 + 9) % 100}%`, top: `${(i * 19 + 5) % 92}%`}}/>)}</div>
    <div className="cinema-content">
      <span className="eyebrow encounter-subtitle">{data.subtitle}</span>
      <p className="encounter-label"><Sparkles size={14}/> {label}</p>
      <div className="encounter-stage"><div className="encounter-orbit orbit-one"/><div className="encounter-orbit orbit-two"/><div className="encounter-glow"/>
        {person ? <img className="encounter-npc pixel" src={`/assets/trainers/${person.image}.png`} alt={name}/> : <img className={`encounter-pokemon ${data.type === 'shiny' ? 'pixel shiny-image' : ''}`} src={data.type === 'shiny' ? sprite(data.pokemonId, true) : artwork(data.pokemonId)} alt={name}/>}
        {isLegend && <span className="encounter-number">No. {String(data.pokemonId).padStart(4, '0')}</span>}
      </div>
      <h2>{name}</h2>
      <p className="encounter-role">{person?.role || creature?.genus} <span>—</span> {person ? '오늘, 우리의 길이 교차했습니다' : creature?.types?.join(' · ')}</p>
      {person ? <blockquote>“{person.quote}”</blockquote> : <p className="encounter-description">{data.body}</p>}
      <button className="cinema-continue" onClick={onClose}>{replay ? '기억을 덮어두기' : '이 순간을 마음에 담기'} <ArrowRight size={18}/></button>
      <span className="cinema-footnote">{replay ? '그날의 빛은, 아직 여기 남아 있습니다.' : '당신의 소중한 기억에 기록됩니다.'}</span>
    </div>
  </Modal>;
}
