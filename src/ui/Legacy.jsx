// Ending extras and the multi-life hall. Data comes from sim/legacy.js; this file only renders it.
// Every block exposes its state through data-* attributes (rarity, earned, color, percent) for styling.
import { Egg, Medal, Star, Trophy, Compass, Heart, Sparkles, BookOpen, Flag } from 'lucide-react';
import { REGIONS } from '../data/regions.js';
import { TOWNS, CAREERS } from '../data/world.js';
import { GOALS } from '../sim/goals.js';
import {
  endingCards, trainerCard, medalsOf, heirCandidates, dexProgress, legacyTotals, legacyRecords, lineages, cardCollection, perkUnlocked,
  MEDALS, MEDAL_GROUPS, STARS, RARITIES, DEX_TOTAL, INHERITANCE_CAP, INHERITANCE_SHARE, CARD_KINDS, PERK_UNLOCKS,
} from '../sim/legacy.js';
import { PERKS, RULES } from '../sim/perks.js';
import { DIFFICULTIES } from '../sim/difficulty.js';
import { sprite } from './assets.js';
import { formatText, pokemonName } from './format.js';

const townName = id => TOWNS.find(t => t.id === id)?.name || '';

const CARD_ICONS = { champion: Trophy, badges: Medal, dex: BookOpen, family: Heart, friend: Heart, rival: Flag, travel: Compass, heritage: Egg };

export function EndingCards({ life }) {
  return <ul className="ending-cards">{endingCards(life).map(card => { const Icon = CARD_ICONS[card.kind] || Sparkles; return <li key={card.id} className="ending-card" data-kind={card.kind} data-rarity={card.rarity}>
    <div className="ending-card-top"><span className="ending-card-rarity">{RARITIES[card.rarity]}</span><Icon size={17} aria-hidden="true"/></div>
    {!card.pokemon && !card.party && <div className="ending-card-emblem" aria-hidden="true"><Icon size={36}/></div>}
    {card.pokemon && <img className="pixel ending-card-art" src={sprite(card.pokemon, card.shiny)} alt={pokemonName(card.pokemon)}/>}
    {card.party && <span className="ending-card-party">{card.party.map((m, i) => <img key={i} className="pixel" src={sprite(m.id, m.shiny)} alt={`${pokemonName(m.id)} Lv.${m.level}`}/>)}</span>}
    <h4>{card.title}</h4>
    <p>{formatText(card.body, life)}</p>
  </li>; })}</ul>;
}

export function TrainerCardView({ card, compact = false }) {
  return <article className={`trainer-card ${compact ? 'compact' : ''}`} data-color={card.color} data-stars={card.stars.length}>
    <header><span className="trainer-card-label">TRAINER CARD</span>
      <span className="trainer-card-stars" aria-label={`별 ${card.stars.length}개`}>{STARS.map(star => <Star key={star.id} size={14} data-earned={card.stars.includes(star.id)} aria-hidden="true"/>)}</span></header>
    <h3>{card.name} <small>{card.generation > 1 ? `${card.generation}대째` : ''}</small></h3>
    <p className="trainer-card-epithet">{card.epithet}</p>
    <dl>
      <dt>나이</dt><dd>{card.age}세</dd>
      <dt>배지</dt><dd>{card.badges}</dd>
      <dt>챔피언</dt><dd>{card.champions.length ? card.champions.map(id => REGIONS.find(r => r.id === id)?.name).join(' · ') : '—'}</dd>
      <dt>도감</dt><dd>관측 {card.seen} · 동료 {card.owned}</dd>
      <dt>배틀 승리</dt><dd>{card.wins}</dd>
      <dt>명성</dt><dd>{card.reputation}</dd>
      <dt>리본</dt><dd>{card.ribbons ?? 0}</dd>
      <dt>심볼</dt><dd>{card.symbols ?? 0}{card.facility ? ` · 시설 기록 ${card.facility}` : ''}</dd>
    </dl>
    {!compact && <ul className="trainer-card-star-list">{STARS.map(star => <li key={star.id} data-earned={card.stars.includes(star.id)}>{card.stars.includes(star.id) ? '★' : '☆'} {star.name}</li>)}</ul>}
  </article>;
}

export function MedalCase({ earned, legacyMedals = null }) {
  return <div className="medal-case">{Object.entries(MEDAL_GROUPS).map(([group, label]) => <section key={group} className="medal-group" data-group={group}>
    <h4>{label}</h4>
    <ul>{MEDALS.filter(m => m.group === group).map(m => {
      const has = earned.includes(m.id), record = legacyMedals?.[m.id];
      return <li key={m.id} className="medal" data-earned={has} data-collected={Boolean(record)}>
        <Medal size={16} aria-hidden="true"/><b>{m.name}</b><small>{m.detail}</small>
        {record && <small className="medal-record">처음: {record.first} · {record.count}회</small>}
      </li>;
    })}</ul>
  </section>)}</div>;
}

export function DexProgress({ ids, label }) {
  const rows = dexProgress(ids);
  return <div className="dex-progress" aria-label={label}>
    <p className="dex-progress-total"><b>{ids.length}</b> / {DEX_TOTAL}종</p>
    <ul>{rows.map(r => <li key={r.id} data-region={r.id} data-percent={r.percent} data-complete={r.count === r.total}>
      <span>{r.name}</span><progress max={r.total} value={r.count}/><small>{r.count}/{r.total}</small>
    </li>)}</ul>
  </div>;
}

/** Lets the player pick which egg the next generation inherits. */
export function HeirPicker({ life, heir, onChoose }) {
  const candidates = heirCandidates(life);
  if (!candidates.length) return <p className="heir-empty">물려줄 수 있는 포켓몬이 없습니다. 전설의 포켓몬은 알을 남기지 않습니다.</p>;
  const chosen = heir?.ancestorSeed === life.seed ? heir.egg : null;
  return <div className="heir-picker">
    <p>다음 세대의 첫 파트너가 될 알을 고르세요. 진화 전 모습으로 태어나며, 색이 다른 부모의 알은 색이 다른 포켓몬이 됩니다. 소지금의 {Math.round(INHERITANCE_SHARE * 100)}%(최대 {INHERITANCE_CAP.toLocaleString()}P)가 유산으로 함께 전해집니다.</p>
    <ul>{candidates.map(c => <li key={c.uid} className="heir-option" data-selected={chosen === c.egg}>
      <button onClick={() => onChoose(c.uid)} aria-pressed={chosen === c.egg}>
        <Egg size={16} aria-hidden="true"/><img className="pixel" src={sprite(c.egg, c.shiny)} alt=""/>
        <span><b>{pokemonName(c.egg)}의 알</b><small>부모 {pokemonName(c.parent)}{c.partner ? ' · 첫 파트너' : ''} · 친밀도 {c.affection}{c.shiny ? ' · 색이 다름' : ''}</small></span>
      </button>
    </li>)}</ul>
    {chosen && <p className="heir-chosen" role="status">{pokemonName(chosen)}의 알을 맡겼습니다. ‘새 삶 시작’에서 이 알로 다음 세대를 시작할 수 있습니다. <button className="text-button" onClick={() => onChoose(null)}>선택 취소</button></p>}
  </div>;
}

/** The hall of past lives, the cumulative Pokédex and the medal collection. */
export function LegacyHall({ legacy, life }) {
  const totals = legacyTotals(legacy);
  return <section className="collection-content legacy-hall">
    <div className="content-title"><div><span className="eyebrow">FAMILY HALL OF FAME</span><h2>가문의 전당</h2>
      <p>이 브라우저에서 끝낸 삶들이 모입니다. 도감과 메달은 모든 삶에 걸쳐 누적됩니다.</p></div></div>
    <ul className="legacy-totals">{[[totals.lives, '끝낸 삶'], [totals.years, '살아온 햇수'], [totals.generations, '최대 세대'], [totals.champions, '리그 타이틀'],
      [totals.wins, '배틀 승리'], [totals.ribbons, '리본'], [totals.symbols, '프런티어 심볼'],
      [totals.seen, '누적 관측'], [totals.owned, '누적 동료 종'], [totals.shiny, '색이 다른 종'], [`${totals.medals}/${totals.medalTotal}`, '메달'], [totals.cards, '엔딩 카드'],
      [`${totals.perks}/${totals.perkTotal}`, '가문 혜택']]
      .map(([n, label]) => <li key={label}><b>{n}</b><span>{label}</span></li>)}</ul>
    {legacy.heir && <p className="legacy-heir" role="status"><Egg size={15}/> {legacy.heir.ancestor}의 {pokemonName(legacy.heir.egg)} 알이 다음 세대를 기다립니다. ‘새로운 삶’에서 시작할 수 있습니다.</p>}

    <h3>지난 삶</h3>
    {legacy.lives.length ? <ol className="legacy-lives">{legacy.lives.map(l => <li key={l.key} className="legacy-life" data-generation={l.generation}>
      <TrainerCardView card={l.card} compact/>
      <div className="legacy-life-detail">
        <p>{townName(l.hometown)}에서 태어나 {l.age}세까지 · {GOALS[l.goal]?.name} · {CAREERS[l.career]?.name || '자율 활동'}{l.ancestor ? ` · ${l.ancestor}의 후손` : ''}{l.difficulty && l.difficulty !== 'normal' ? <> · <span className="legacy-difficulty" data-difficulty={l.difficulty}>{DIFFICULTIES[l.difficulty]?.name}</span></> : ''}</p>
        {l.partner && <p className="legacy-partner"><img className="pixel" src={sprite(l.partner.id, l.partner.shiny)} alt=""/> 첫 파트너 {pokemonName(l.partner.id)} · Lv.{l.partner.level} · {l.partner.years}년</p>}
        <span className="legacy-party">{l.party.map((m, i) => <img key={i} className="pixel" src={sprite(m.id, m.shiny)} alt={`${pokemonName(m.id)} Lv.${m.level}`}/>)}</span>
        <small>메달 {l.medals.length}개 · 엔딩 카드 {l.cards.length}장{l.rules?.length ? ` · 규칙: ${l.rules.map(id => RULES[id]?.name).join(', ')}` : ''}</small>
      </div>
    </li>)}</ol> : <p className="legacy-empty">아직 끝낸 삶이 없습니다. 첫 삶을 마치면 이곳에 트레이너 카드가 걸립니다.</p>}

    <h3>기록실</h3>
    <ul className="legacy-records">{legacyRecords(legacy).map(r => <li key={r.id} data-record={r.id} data-set={Boolean(r.best)}>
      <span>{r.label}</span>{r.best ? <><b>{r.best.value.toLocaleString()}{r.unit}</b><small>{r.best.holder}{r.best.generation > 1 ? ` · ${r.best.generation}대` : ''}</small></> : <b>—</b>}
    </li>)}</ul>

    {lineages(legacy).length > 0 && <><h3>가계도</h3>
      <ol className="legacy-lineages">{lineages(legacy).map(chain => <li key={chain[0].key}><ol className="lineage">{chain.map(l => <li key={l.key} data-generation={l.generation}>
        {l.partner && <img className="pixel" src={sprite(l.partner.id, l.partner.shiny)} alt=""/>}<b>{l.name}</b><small>{l.generation}대 · {l.age}세 · {l.epithet}</small></li>)}</ol></li>)}</ol></>}

    <h3>가문 혜택</h3>
    <ul className="perk-status">{Object.entries(PERKS).map(([id, perk]) => <li key={id} data-unlocked={perkUnlocked(legacy, id)}>
      <b>{perk.name}</b><small>{perk.detail}</small><small className="perk-unlock">{perkUnlocked(legacy, id) ? '해금됨 · 새로운 삶에서 선택' : `조건: ${PERK_UNLOCKS[id].text}`}</small></li>)}</ul>

    <h3>엔딩 카드 도감</h3>
    <ul className="card-catalog">{Object.entries(CARD_KINDS).map(([kind, name]) => { const c = cardCollection(legacy)[kind];
      return <li key={kind} data-kind={kind} data-collected={Boolean(c)}><b>{name}</b><small>{c ? `${c.distinct}종 · ${c.copies}장` : '아직 없음'}</small></li>; })}</ul>

    <h3>누적 도감</h3>
    <DexProgress ids={legacy.dex.seen} label="모든 삶의 누적 관측"/>
    <h3>현재 삶을 포함한 메달</h3>
    <MedalCase earned={medalsOf(life)} legacyMedals={legacy.medals}/>
  </section>;
}

export { trainerCard, medalsOf };
