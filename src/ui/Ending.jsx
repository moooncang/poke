import { talentLabel } from '../sim/talent.js';
import { useState } from 'react';
import { Download, Trophy, RotateCcw, Search } from 'lucide-react';
import { TOWNS, CAREERS } from '../data/world.js';
import { REGIONS } from '../data/regions.js';
import { championFlag } from '../data/league-sagas.js';
import { xpLevel } from '../sim/battle.js';
import { Modal, EffectChips, PokeBall } from './common.jsx';
import { sprite } from './assets.js';
import { formatText, pokemonName } from './format.js';
import { EndingCards, TrainerCardView, MedalCase, DexProgress, HeirPicker } from './Legacy.jsx';
import { trainerCard, medalsOf } from '../sim/legacy.js';

const ORIGINS = { partner: '첫 파트너', wild: '야생에서 만남', adopted: '입양', starter: '첫 동료', legend: '전설의 만남', egg: '알에서 부화', gift: '선물', rescued: '구조' };
const FILTERS = { all: '전체 기록', choices: '선택과 결과', echoes: '선택의 여파', party: '포켓몬', people: '인연', saved: '저장한 추억' };
export function EndingModal({ life, legacy, onChooseHeir, onDownload, onNew, onClose, onShare }) {
  const [tab, setTab] = useState('cards');
  const [filter, setFilter] = useState('all');
  const [decade, setDecade] = useState('all');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(30);
  const text = (value, entry) => formatText(value, life, entry);
  const home = TOWNS.find(t => t.id === life.hometown);
  const champions = REGIONS.filter(r => life.flags[championFlag(r)]);
  const members = [...life.party, ...life.box].sort((a, b) => a.joined - b.joined || a.uid - b.uid);
  const choices = life.log.filter(e => e.resolution);
  const echoes = life.log.filter(e => e.echo);
  const matches = life.log.filter(e => {
    const category = filter === 'all' || (filter === 'choices' && e.resolution) || (filter === 'echoes' && e.echo)
      || (filter === 'party' && (e.kind === 'party' || e.encounter?.pokemonId || e.choices?.some(c => c.join || c.captureJoin))) || (filter === 'people' && e.kind === 'people') || (filter === 'saved' && life.memories.includes(e.id));
    return category && (decade === 'all' || Math.floor(e.age / 10) === Number(decade))
      && text(`${e.title} ${e.body} ${e.resolution?.label || ''} ${e.resolution?.text || ''}`, e).toLowerCase().includes(query.toLowerCase().trim());
  });
  const reset = setter => event => { setter(event.target.value); setLimit(30); };
  return <Modal title="생애 기록관" onClose={onClose} className="ending-modal life-archive">
    <header className="archive-hero"><span className="eyebrow">POKÉLIFE / LIFETIME ARCHIVE</span><PokeBall className="archive-watermark"/>
      <h2>{life.name}의 생애 기록관</h2><p>{home?.region} · {home?.name}에서 시작한 {life.age}년의 여정</p>
      <span className="archive-title">{champions.length ? `${champions.map(r => r.name).join(' · ')} 리그 챔피언` : CAREERS[life.career]?.name || '자유로운 모험가'} · 명성 {life.reputation}</span>
      <div className="archive-team">{life.party.map(p => <img key={p.uid} className="pixel" src={sprite(p.id, p.shiny)} alt={pokemonName(p.id)}/>)}</div>
    </header>
    <div className="archive-body">
      <div className="archive-stats">{[[life.visited.length, '머문 마을'], [members.length, '함께한 동료'], [life.game.wins, '배틀 승리'], [choices.length, '내린 결정'], [echoes.length, '이어진 여파'], [life.seen.length, '도감 발견']].map(([n, label]) => <div key={label}><b>{n}</b><span>{label}</span></div>)}</div>
      <nav className="archive-tabs" aria-label="기록관 분류">{[['cards','엔딩 카드'], ['trainer','트레이너 카드'], ['journey','생애 연표'], ['companions','동료 앨범'], ['honors','업적 · 발자취'], ['heir','다음 세대']].map(([id, label]) => <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</nav>
      {tab === 'cards' && <section className="archive-cards"><h3>이 삶의 엔딩 카드</h3><EndingCards life={life}/></section>}
      {tab === 'trainer' && <section className="archive-trainer"><TrainerCardView card={trainerCard(life)}/>
        <h3>메달</h3><MedalCase earned={medalsOf(life)} legacyMedals={legacy?.medals}/>
        <h3>이 삶의 도감</h3><DexProgress ids={life.seen} label="이 삶의 지방별 도감"/></section>}
      {tab === 'heir' && <section className="archive-heir"><h3>다음 세대에게 알 물려주기</h3>
        {onChooseHeir ? <HeirPicker life={life} heir={legacy?.heir} onChoose={onChooseHeir}/> : <p>생애가 끝난 뒤에 고를 수 있습니다.</p>}</section>}
      {tab === 'journey' && <section>
        <div className="archive-filters"><label><Search size={15}/><input aria-label="생애 기록 검색" placeholder="사건, 포켓몬, 선택 검색" value={query} onChange={reset(setQuery)}/></label>
          <select aria-label="기록 종류" value={filter} onChange={reset(setFilter)}>{Object.entries(FILTERS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
          <select aria-label="나이 구간" value={decade} onChange={reset(setDecade)}><option value="all">모든 나이</option>{Array.from({length: Math.floor(life.age / 10) + 1}, (_, n) => <option key={n} value={n}>{n * 10}–{Math.min(life.age, n * 10 + 9)}세</option>)}</select>
        </div><p className="archive-count">{matches.length}개 기록 · 시간순</p>
        <div className="archive-timeline">{matches.slice(0, limit).map(e => <article key={e.id}><div className="archive-age">{e.age}<small>세</small></div><div><small>{TOWNS.find(t => t.id === e.town)?.name} {life.memories.includes(e.id) ? ' · ★ 저장한 추억' : ''}</small><h3>{text(e.title, e)}</h3><p>{text(e.body, e)}</p>
          {e.echo && <div className="archive-source">↳ {e.echo.age}세 「{text(e.echo.title, e)}」에서 이어진 결과</div>}
          {e.resolution && <div className="archive-decision"><b>선택 · {text(e.resolution.label, e)}</b>{e.resolution.check && <small>{e.resolution.check.success ? '성공' : '실패'} · 당시 성공률 {e.resolution.check.chance}%</small>}<p>{text(e.resolution.text, e)}</p><EffectChips effects={e.resolution.effects}/></div>}
        </div></article>)}</div>
        {!matches.length && <p className="archive-empty">이 조건에 해당하는 기록이 없습니다.</p>}
        {matches.length > limit && <button className="secondary-button wide" onClick={() => setLimit(n => n + 30)}>다음 기록 30개 보기 ({matches.length - limit}개 남음)</button>}
      </section>}
      {tab === 'companions' && <section><h3>함께한 모든 동료</h3><p>파티와 PC 박스의 동료를 처음 만난 나이순으로 모았습니다.</p><div className="archive-companions">{members.map(p => <article key={p.uid}><img className="pixel" src={sprite(p.id, p.shiny)} alt=""/><div><small>{ORIGINS[p.origin] || '동료'}{p.shiny ? ' · 색이 다른 포켓몬' : ''}</small><h3>{pokemonName(p.id)} <span>Lv.{xpLevel(p)}</span></h3><p>{p.joined}세에 합류 · 함께한 시간 {Math.max(0, life.age - p.joined)}년</p><small>친밀도 {p.affection} · {life.party.some(m => m.uid === p.uid) ? '마지막 파티' : 'PC 박스'}</small></div></article>)}</div>{!members.length && <p>함께한 포켓몬이 없습니다.</p>}</section>}
      {tab === 'honors' && <section className="archive-honors"><h3><Trophy size={20}/> 리그 명예의 전당</h3><div className="archive-leagues">{REGIONS.map(r => <article key={r.id} className={champions.includes(r) ? 'champion' : ''}><b>{r.name}</b><strong>{champions.includes(r) ? '★ 챔피언' : `배지 ${life.game.badges[r.id] || 0} / 8`}</strong></article>)}</div>
        <h3>타고난 재능</h3><p>{talentLabel(life)}{life.flags[`talent-${life.talent.field}-trained`]?' · 연습 과정 수료':''}</p><h3>출생과 마지막 경력</h3><p>{life.family} · {life.background.wealth}</p><p>{CAREERS[life.career]?.name || '자율 활동'} · 경력 {life.careerRank || 0}단계 · {life.work.years}년차{life.work.retired ? ' · 은퇴' : ''}</p>
        <h3>머물렀던 마을</h3><div className="archive-route">{life.visited.map((id, i) => { const t = TOWNS.find(t => t.id === id); return <span key={id}><small>{String(i + 1).padStart(2,'0')}</small>{t?.region} · {t?.name}</span>; })}</div>
      </section>}
      <footer className="archive-footer"><button className="primary-button" onClick={onDownload}><Download size={16}/> 전체 기록 내려받기</button>{onShare && <button className="secondary-button" onClick={onShare}>요약 복사</button>}<button className="text-button" onClick={onNew}><RotateCcw size={14}/> 새 삶 시작</button></footer>
    </div>
  </Modal>;
}
