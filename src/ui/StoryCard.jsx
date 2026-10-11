import { Bookmark, Check, Compass, Feather, History, Leaf, Newspaper, Play, Sparkles, Sprout, Users, Boxes } from 'lucide-react';
import { TOWNS, NPCS, SEASONS } from '../data/world.js';
import { asset, sprite } from './assets.js';
import { EffectChips } from './common.jsx';
import { formatText, pokemonName } from './format.js';

const KINDS = {
  work: [Compass, '직업 활동'],
  choice: [Feather, '선택 사건'],
  auto: [Feather, '스스로 정한 일'],
  milestone: [Sprout, '주요 사건'],
  ending: [Sprout, '생애 종료'],
  news: [Newspaper, '지방 소식'],
  people: [Users, '인연의 소식'],
  party: [Boxes, '파티 · 박스'],
  echo: [History, '지난 선택의 여파'],
  life: [Leaf, '일상 기록'],
};

function EncounterTicket({ special, onReplay, age }) {
  const label = special.type === 'legendary' ? '전설의 포켓몬' : special.type === 'shiny' ? '색이 다른 포켓몬' : '특별한 만남';
  return <button className={`encounter-ticket ${special.type}`} onClick={() => onReplay(special, age)}>
    <span className="ticket-portrait">
      {special.npc
        ? <img className="pixel" src={asset(`assets/trainers/${NPCS[special.npc].image}.png`)} alt=""/>
        : <img className="pixel" src={sprite(special.pokemonId, special.type === 'shiny')} alt=""/>}
    </span>
    <span><small>{label}</small><b>{special.npc ? NPCS[special.npc].name : pokemonName(special.pokemonId)}</b></span>
    <span className="ticket-action">다시 보기 <Play size={12}/></span>
  </button>;
}

export function StoryCard({ entry, life, onMemory, onReplay, compact = false }) {
  const special = entry.encounter;
  const [Icon, title] = special ? [Sparkles, '특별한 만남'] : KINDS[entry.kind] || KINDS.life;
  const text = value => formatText(value, life, entry);
  const saved = life.memories.includes(entry.id);
  return <article className={`story-row kind-${entry.kind} ${special ? 'special-row' : ''} ${entry.choices && !entry.resolution ? 'choice-row' : ''}`}>
    {!compact && <div className="story-age"><b>{entry.age}</b><span>살의 {SEASONS[entry.season]}</span></div>}
    <div className="timeline-dot"><Icon size={15}/></div>
    <div className="story-card">
      <div className="story-card-top">
        <span className="story-category"><Icon size={12}/>{title}</span>
        <div>
          <span className="story-place">{TOWNS.find(t => t.id === entry.town)?.name}</span>
          <button className={`bookmark-button ${saved ? 'saved' : ''}`} onClick={() => onMemory(entry.id)} aria-label={saved ? '저장 기록 해제' : '기록 저장'} aria-pressed={saved}><Bookmark size={15}/></button>
        </div>
      </div>
      <h3>{text(entry.title)}</h3>
      {entry.echo && <p className="echo-source"><History size={12}/> {entry.echo.age}세 「{text(entry.echo.title)}」의 선택에서 이어진 일</p>}
      <p>{text(entry.body)}</p>
      {special && <EncounterTicket special={special} onReplay={onReplay} age={entry.age}/>}
      {entry.resolution && <div className="choice-result">
        <span><Check size={13}/> {text(entry.resolution.label)}</span>
        {entry.resolution.check && <strong className={`check-result ${entry.resolution.check.success ? 'success' : 'failure'}`}>
          {entry.resolution.check.success ? '성공' : '실패'} · 도전 당시 성공률 {entry.resolution.check.chance}%</strong>}
        <p>{text(entry.resolution.text)}</p>
        {entry.resolution.lasting && <small className="lasting-note">이 선택은 몇 년 뒤의 삶에 다시 영향을 줄 수 있다.</small>}
      </div>}
      <EffectChips effects={entry.resolution?.effects || entry.effects}/>
    </div>
  </article>;
}
