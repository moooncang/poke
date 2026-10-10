import { useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, Volume2, VolumeX } from 'lucide-react';
import { NPCS } from '../data/world.js';
import { POKEMON, asset, sprite, artwork } from './assets.js';
import { Modal } from './common.jsx';

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

export function Encounter({ data, age, onClose, sound, toggleSound, replay = false, decisionNext = false }) {
  const creature = POKEMON[data.pokemonId];
  const person = NPCS[data.npc];
  const name = person?.name || creature?.name;
  const chimed = useRef(false);
  useEffect(() => { if (sound && !chimed.current) { chimed.current = true; playChime(data.type); } }, [data.logId]);
  const isLegend = data.type === 'legendary';
  const label = { legendary: creature?.mythical ? '환상의 만남' : '전설과 마주하다', shiny: '색이 다른 포켓몬', npc: '주요 NPC', partner: '첫 파트너', evolution: '포켓몬 진화' }[data.type];
  return <Modal title={`${label}: ${name}`} onClose={onClose} className={`encounter-backdrop ${data.type}`}>
    <div className="cinema-grain"/>
    <div className="cinema-top"><span>POKÉLIFE <b>·</b> {replay ? 'MEMORY' : `${age} YEARS`}</span><button className="icon-button" onClick={toggleSound} aria-label={sound ? '소리 끄기' : '소리 켜기'}>{sound ? <Volume2 size={18}/> : <VolumeX size={18}/>}</button></div>
    <div className="encounter-stars" aria-hidden="true">{Array.from({length: 24}, (_, i) => <i key={i} style={{'--i': i, left: `${(i * 37 + 9) % 100}%`, top: `${(i * 19 + 5) % 92}%`}}/>)}</div>
    <div className="cinema-content">
      <span className="eyebrow encounter-subtitle">{data.subtitle}</span>
      <p className="encounter-label"><Sparkles size={14}/> {label}</p>
      <div className="encounter-stage"><div className="encounter-orbit orbit-one"/><div className="encounter-orbit orbit-two"/><div className="encounter-glow"/>
        {person ? <img className="encounter-npc pixel" src={asset(`assets/trainers/${person.image}.png`)} alt={name}/> : <img className={`encounter-pokemon ${data.type === 'shiny' ? 'pixel shiny-image' : ''}`} src={data.type === 'shiny' ? sprite(data.pokemonId, true) : artwork(data.pokemonId)} alt={name}/>}
        {isLegend && <span className="encounter-number">No. {String(data.pokemonId).padStart(4, '0')}</span>}
      </div>
      <h2>{name}</h2>
      <p className="encounter-role">{person?.role || creature?.genus} <span>—</span> {person ? '오늘, 우리의 길이 교차했습니다' : creature?.types?.join(' · ')}</p>
      {person ? <blockquote>“{person.quote}”</blockquote> : <p className="encounter-description">{data.body}</p>}
      <button className="cinema-continue" onClick={onClose}>{replay ? '다시 보기 종료' : decisionNext ? '확인 · 어떻게 할지 정하기' : '확인 · 계속하기'} <ArrowRight size={18}/></button>
      <span className="cinema-footnote">{replay ? '저장된 만남 다시 보기' : '도감과 주요 사건 기록에 등록됩니다.'}</span>
    </div>
  </Modal>;
}
