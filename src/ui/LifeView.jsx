import { Lock } from 'lucide-react';
import { GENDERS, PARTY_LIMIT } from '../engine.js';
import { TOWNS, SEASONS, CAREERS } from '../data/world.js';
import { REGIONS } from '../data/regions.js';
import { MECHANICS, xpLevel, badgeCount } from '../sim/battle.js';
import { WORLD_KEYS, conditionName } from '../sim/world.js';
import { PATHS } from '../sim/people.js';
import { DISPOSITIONS, dominantDisposition } from '../sim/party.js';
import { sprite, asset } from './assets.js';
import { pokemonName } from './format.js';
import { annualTraining } from '../data/progression.js';

const STATS = { vitality: '건강', joy: '행복', wisdom: '지식', courage: '용기', bond: '유대' };
const RELATIONSHIP = { single: '교제 중인 상대 없음', friends: '친구', dating: '교제 중', engaged: '약혼', married: '배우자' };
const reputationTier = r => r < 15 ? '무명' : r < 35 ? '동네에서 알려짐' : r < 60 ? '지방의 유명인' : r < 85 ? '전국구 트레이너' : '살아 있는 전설';
const levelLabel = value => value < 35 ? '낮음' : value > 65 ? '높음' : '보통';

function Meter({ label, value, detail }) {
  return <div className="life-stat"><span>{label}</span><meter min="0" max="100" low="35" high="65" optimum="80" value={value}/><b>{detail ?? value}</b></div>;
}

export function LifeScene({ life, running }) {
  const town = TOWNS.find(t => t.id === life.town);
  const trainer = life.gender === 'female' ? 'assets/trainers/leaf.png' : 'assets/trainers/red.png';
  return <section className={`life-scene ${running ? 'moving' : ''}`}>
    <div className="scene-sky"><span>☁</span><span>☁</span></div>
    <div className="scene-houses">⌂ <b>✚</b> ⌂</div>
    <div className="scene-road"/>
    <div className="scene-walker"><img src={asset(trainer)} alt=""/>{life.party[0] && <img src={sprite(life.party[0].id, life.party[0].shiny)} alt=""/>}</div>
    <div className="scene-caption"><b>{town.region} · {town.name}</b><span>{SEASONS[life.season]} · {running ? '생활 진행 중' : '관찰 중'}</span></div>
  </section>;
}

function PartyMember({ member, onPokemon }) {
  return <button className="life-party" onClick={() => onPokemon(member.id)}>
    <img src={sprite(member.id, member.shiny)} alt=""/>
    <span><b>{pokemonName(member.id)} {member.locked && <Lock size={11} aria-label="전설 · 파티 고정"/>}</b>
      <small>Lv.{xpLevel(member)} · 친밀도 {member.affection}{member.origin === 'partner' ? ' · 첫 파트너' : ''}</small><progress className="party-xp" max="25" value={xpLevel(member)>=100?25:member.xp%25} aria-label={`${pokemonName(member.id)} 다음 레벨 경험치`}/></span>
  </button>;
}

export function LifeSidebar({ life, onPokemon, side = 'trainer' }) {
  const hometown = TOWNS.find(t => t.id === life.hometown), town = TOWNS.find(t => t.id === life.town);
  const region = REGIONS.find(r => r.id === town.map), state = life.world.regions[town.map];
  const conditions = life.world.conditions;
  const rel = life.relationship, disposition = dominantDisposition(life);
  const cast = Object.entries(life.cast).filter(([id, p]) => id !== 'rival' || p.met);
  return <aside className={`life-sidebar sidebar-${side}`} aria-label={side === 'trainer' ? '트레이너 정보' : '파티와 세계 정보'}>
    {side === 'trainer' ? <>
    <section className="dex-panel passport">
      <div className="dex-panel-title">TRAINER LICENSE <span>● 등록됨</span></div>
      <div className="trainer-identity"><img className="pixel" src={asset(life.gender === 'female' ? 'assets/trainers/leaf.png' : 'assets/trainers/red.png')} alt="트레이너"/><div><small>포켓몬 트레이너</small><h2>{life.name}</h2><span>{life.age}세 · {GENDERS[life.gender]}</span></div></div>
      <dl>
        <dt>성별</dt><dd>{GENDERS[life.gender]}</dd>
        <dt>출신 지방</dt><dd>{hometown.region} · {hometown.name}</dd>
        <dt>가족 구성</dt><dd>{life.family}</dd>
        <dt>가족 형편</dt><dd>{life.background.wealth}</dd>
        <dt>출생 환경</dt><dd>{life.background.home}<br/>{life.background.environment}</dd>
        <dt>성향</dt><dd>{DISPOSITIONS[disposition]} <small>({Object.entries(life.disposition).filter(([, v]) => v).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${DISPOSITIONS[k]} ${v}`).join(' · ')})</small></dd>
        <dt>명성</dt><dd>{reputationTier(life.reputation)} <small>({life.reputation})</small></dd>
        <dt>일</dt><dd>{life.career ? `${CAREERS[life.career].name}${life.work.retired ? ' · 은퇴' : ` · 경력 ${life.careerRank || 0}단계 · ${life.work.years}년차 · 만족 ${life.work.satisfaction}`}` : '자율 활동'}</dd>
        <dt>연간 육성</dt><dd>파티 경험치 +{annualTraining(life)}</dd>
      </dl>
      <div className="money-display">소지금 <b>{life.money.toLocaleString()} P</b></div>
      {life.ledger && <small className="ledger">작년 수입 {life.ledger.income.toLocaleString()}P · 지출 {life.ledger.expense.toLocaleString()}P</small>}
    </section>
    <section className="dex-panel"><h3>트레이너 상태</h3>
      {Object.entries(STATS).map(([key, label]) => <Meter key={key} label={label} value={life.stats[key]}/>)}
    </section>
    <section className="dex-panel cast-panel"><h3>인연</h3>
      {cast.map(([id, person]) => <div className="cast-row" key={id}>
        {id === 'rival' && <img className="pixel" src={asset('assets/trainers/rival.png')} alt=""/>}
        <span><b>{person.name}</b> <small>{person.role} · {PATHS[person.path] || ''}{id === 'family' && person.path !== 'gone' ? ` · 건강 ${person.health}` : ''}</small></span>
        {person.affinity !== undefined && <meter min="0" max="100" value={person.affinity} aria-label={`${person.name} 관계`}/>}
      </div>)}
      <p>{rel.status === 'single' ? RELATIONSHIP.single : `${rel.name} · ${RELATIONSHIP[rel.status]} · 신뢰 ${rel.trust}`}<br/>자녀 {rel.children}명{rel.marriedAt ? ` · ${rel.marriedAt}세에 결혼` : ''}</p>
    </section>
    </> : <>
    <section className="dex-panel"><h3>포켓몬 파티 <small>{life.party.length}/{PARTY_LIMIT}</small></h3>
      {life.party.length ? life.party.map(member => <PartyMember key={member.uid} member={member} onPokemon={onPokemon}/>) : <p>6세에 첫 파트너를 만납니다.</p>}
      <div className="party-empty-slots" aria-label="남은 파티 자리">{Array.from({length:Math.max(0,PARTY_LIMIT-life.party.length)},(_,i)=><span key={i}>＋ 빈 슬롯</span>)}</div><details className="pc-box"><summary>PC 박스 · {life.box.length}마리</summary>
        {life.box.length ? <div className="box-grid">{life.box.map(member =>
          <button key={member.uid} onClick={() => onPokemon(member.id)} title={`${pokemonName(member.id)} Lv.${xpLevel(member)}`}><img className="pixel" src={sprite(member.id, member.shiny)} alt={pokemonName(member.id)}/></button>)}</div>
          : <p>아직 맡긴 포켓몬이 없다.</p>}
      </details>
      <small>6마리를 넘으면 성향에 따라 스스로 파티를 다시 짠다. 전설의 포켓몬은 언제나 파티에 둔다.</small>
    </section>
    <section className="dex-panel world-panel"><h3>{region.name}지방 정세</h3>
      {Object.entries(WORLD_KEYS).map(([key, label]) => <Meter key={key} label={label} value={state[key]} detail={levelLabel(state[key])}/>)}
      <ul className="condition-list">
        {conditions.length === 0 && <li className="quiet">특별한 사건 없이 평온하다.</li>}
        {[...conditions].sort((a, b) => (b.region === town.map) - (a.region === town.map)).slice(0, 6).map(c =>
          <li key={`${c.id}-${c.region}`} className={c.region === town.map ? 'here' : ''}>
            {c.region === town.map ? '● ' : ''}{REGIONS.find(r => r.id === c.region).name} · {conditionName(c.id, c.region)} <small>~{c.until}세</small>
          </li>)}
      </ul>
      <small>세계는 매년 스스로 변한다. 경기는 수입을, 치안과 생태는 찾아오는 사건을 바꾼다.</small>
    </section>
    <section className="dex-panel"><h3>장비와 리그</h3>
      {Object.entries(MECHANICS).map(([id, m]) => <p key={id}>{life.game.gear.includes(id) ? '●' : '○'} {m.name}</p>)}
      <p>획득 배지 {badgeCount(life)}개 · 배틀 승리 {life.game.wins}회 · 몬스터볼 {life.game.balls}개</p>
      <small>배틀과 장비 해금은 사건의 선택 결과로 진행된다.</small>
    </section>
    </>}
  </aside>;
}

export function LifeAtlas({ life }) {
  return <section className="life-atlas">
    <h2>여행 기록과 세계 정세</h2>
    <p>각 지방의 경기·치안·생태는 해마다 달라진다. 이주 제안은 지금 살기 좋아 보이는 곳에서 도착한다.</p>
    <div>{REGIONS.map(r => { const state = life.world.regions[r.id], active = life.world.conditions.filter(c => c.region === r.id);
      return <article className="dex-panel" key={r.id}>
        <h3>{r.name}지방</h3>
        <p className="atlas-state">{Object.entries(WORLD_KEYS).map(([k, label]) => `${label} ${state[k]}`).join(' · ')}</p>
        {active.length > 0 && <p className="atlas-conditions">{active.map(c => conditionName(c.id, r.id)).join(' · ')}</p>}
        {TOWNS.filter(t => t.map === r.id).map(t => <p key={t.id} className={life.town === t.id ? 'current' : ''}>{life.visited.includes(t.id) ? '●' : '○'} {t.name}{life.town === t.id ? ' · 현재' : ''}</p>)}
      </article>; })}</div>
  </section>;
}
