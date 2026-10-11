// The simulation report: how this life actually moved, year by year. Charts are plain SVG; see
// docs/DESIGN-HANDOFF.md for class names and data-* states.
import { useState } from 'react';
import { HISTORY_KEYS, series, historyHighlights } from '../sim/history.js';
import { decisionStats, battleStats, chronicle, residence, memberStory } from '../sim/analytics.js';
import { CONTEST_CATEGORIES, CONTEST_RANKS, ribbonFlag, ribbonCount } from '../sim/contest.js';
import { FACILITIES, REGION_FACILITIES, symbolFlag, facilityTier } from '../data/frontier.js';
import { REGIONS } from '../data/regions.js';
import { TOWNS } from '../data/world.js';
import { xpLevel } from '../sim/battle.js';
import { RULES, PERKS } from '../sim/perks.js';
import { sprite } from './assets.js';
import { formatText, pokemonName } from './format.js';

const W = 640, H = 180, PAD = 28;

/** A small multi-line chart over age. `lines` = [{ key, label }]; values are scaled to the chart's own maximum. */
export function LineChart({ life, lines, title, max: fixedMax }) {
  const data = lines.map(l => ({ ...l, points: series(life, l.key) }));
  const ages = data[0]?.points.map(p => p[0]) || [];
  if (ages.length < 2) return <figure className="report-chart empty"><figcaption>{title}</figcaption><p>2년 이상 기록이 쌓이면 그래프가 그려집니다.</p></figure>;
  const minAge = ages[0], maxAge = ages.at(-1);
  const max = fixedMax ?? Math.max(1, ...data.flatMap(d => d.points.map(p => p[1])));
  const x = age => PAD + (age - minAge) / Math.max(1, maxAge - minAge) * (W - PAD * 2);
  const y = v => H - PAD + 4 - (v / max) * (H - PAD * 2);
  const ticks = Array.from(new Set([minAge, ...ages.filter(a => a % 10 === 0), maxAge]));
  return <figure className="report-chart" data-lines={lines.length}>
    <figcaption>{title}</figcaption>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: ${minAge}세부터 ${maxAge}세까지`}>
      <line className="axis" x1={PAD} y1={H - PAD + 4} x2={W - PAD} y2={H - PAD + 4}/>
      {ticks.map(a => <g key={a} className="tick"><line x1={x(a)} y1={H - PAD + 4} x2={x(a)} y2={H - PAD + 8}/><text x={x(a)} y={H - 6} textAnchor="middle">{a}</text></g>)}
      <text className="max-label" x={PAD} y={12}>{max.toLocaleString()}</text>
      {data.map((d, i) => <polyline key={d.key} className="series" data-series={d.key} data-index={i} fill="none" points={d.points.map(([a, v]) => `${x(a).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}/>)}
    </svg>
    <ul className="chart-legend">{data.map((d, i) => <li key={d.key} data-series={d.key} data-index={i}>{d.label} <b>{(d.points.at(-1)?.[1] ?? 0).toLocaleString()}</b></li>)}</ul>
  </figure>;
}

function Bars({ items, label }) {
  const max = Math.max(1, ...items.map(i => i.count));
  return <ul className="report-bars" aria-label={label}>{items.map(i => <li key={i.id} data-id={i.id}>
    <span>{i.label}</span><span className="bar" style={{ '--share': i.count / max }}><i/></span><b>{i.count}</b>
  </li>)}</ul>;
}

function MemberStory({ life, uid, onRename }) {
  const story = memberStory(life, uid);
  const [name, setName] = useState(story?.member.nickname || '');
  if (!story) return null;
  const m = story.member;
  return <article className="member-story" data-in-party={story.inParty} data-shiny={m.shiny}>
    <header><img className="pixel" src={sprite(m.id, m.shiny)} alt=""/><div>
      <h4>{m.nickname ? `${m.nickname} · ` : ''}{pokemonName(m.id)} <small>Lv.{story.level}</small></h4>
      <p>{m.joined}세에 {story.met || '어딘가'}에서 합류 · 함께한 {story.years}년 · {story.inParty ? '파티' : 'PC 박스'}</p>
    </div></header>
    <dl>
      <dt>배틀</dt><dd>{story.wins}승 / {story.battles}전</dd>
      <dt>친밀도</dt><dd>{m.affection}</dd>
      <dt>진화</dt><dd>{story.evolutions.length ? story.evolutions.map(([age, from]) => `${age}세 ${pokemonName(from)}에서`).join(' → ') : '—'}</dd>
      <dt>리본</dt><dd>{story.ribbons.length ? story.ribbons.map(r => { const [c, rank] = r.split('-'); return `${CONTEST_CATEGORIES[c]?.name} ${CONTEST_RANKS[rank]}`; }).join(' · ') : '—'}</dd>
    </dl>
    {onRename && <form className="member-rename" onSubmit={e => { e.preventDefault(); onRename(uid, name); }}>
      <label>별명<input maxLength={12} value={name} placeholder={pokemonName(m.id)} onChange={e => setName(e.target.value)}/></label>
      <button type="submit">저장</button>
    </form>}
    {story.mentions.length > 0 && <details><summary>관련 기록 {story.mentions.length}개</summary>
      <ul className="member-mentions">{story.mentions.map(e => <li key={e.id}><b>{e.age}세</b> {formatText(e.title, life, e)}</li>)}</ul></details>}
  </article>;
}

export function SimulationReport({ life, onRename }) {
  const [region, setRegion] = useState('all');
  const [member, setMember] = useState(null);
  const [shown, setShown] = useState(40);
  const high = historyHighlights(life), stats = decisionStats(life), battles = battleStats(life), lived = residence(life);
  const news = chronicle(life, { region });
  const members = [...life.party, ...life.box].sort((a, b) => a.joined - b.joined || a.uid - b.uid);
  const selected = member ?? members[0]?.uid ?? null;
  return <section className="collection-content simulation-report">
    <div className="content-title"><div><span className="eyebrow">SIMULATION REPORT</span><h2>시뮬레이션 리포트</h2>
      <p>해마다 기록된 수치와 사건으로 이 삶이 어떻게 흘러왔는지 봅니다.</p></div></div>

    <section className="report-section" aria-labelledby="report-graphs"><h3 id="report-graphs">생애 그래프</h3>
      <div className="report-charts">
        <LineChart life={life} title="소지금" lines={[{ key: 'money', label: '소지금' }]}/>
        <LineChart life={life} title="연간 수입과 지출" lines={[{ key: 'income', label: '수입' }, { key: 'expense', label: '지출' }]}/>
        <LineChart life={life} title="능력치" max={100} lines={['joy', 'vit', 'cou', 'wis', 'bond'].map(key => ({ key, label: HISTORY_KEYS[key] }))}/>
        <LineChart life={life} title="명성과 파티 최고 레벨" max={100} lines={[{ key: 'rep', label: '명성' }, { key: 'lv', label: '최고 레벨' }]}/>
        <LineChart life={life} title="수집" lines={[{ key: 'seen', label: '도감' }, { key: 'badges', label: '배지' }, { key: 'box', label: '박스' }]}/>
        <LineChart life={life} title="사는 지방의 정세" max={100} lines={[{ key: 'eco', label: '경기' }, { key: 'saf', label: '치안' }, { key: 'ecl', label: '생태' }]}/>
      </div>
      {high && <ul className="report-highlights">
        <li><span>가장 부유했던 해</span><b>{high.richest.age}세 · {high.richest.value.toLocaleString()}P</b></li>
        <li><span>가장 가난했던 해</span><b>{high.poorest.age}세 · {high.poorest.value.toLocaleString()}P</b></li>
        <li><span>가장 행복했던 해</span><b>{high.happiest.age}세 · {high.happiest.value}</b></li>
        <li><span>가장 힘들었던 해</span><b>{high.hardest.age}세 · {high.hardest.value}</b></li>
        <li><span>명성 최고</span><b>{high.famous.age}세 · {high.famous.value}</b></li>
        <li><span>평생 수입 / 지출</span><b>{high.totalIncome.toLocaleString()}P / {high.totalExpense.toLocaleString()}P</b></li>
        <li><span>첫 배지</span><b>{high.firstBadgeAge ?? '—'}{high.firstBadgeAge !== null ? '세' : ''}</b></li>
        <li><span>첫 리그 타이틀</span><b>{high.firstTitleAge ?? '—'}{high.firstTitleAge !== null ? '세' : ''}</b></li>
      </ul>}
      <details className="report-table"><summary>연도별 기록 표 ({life.history?.length || 0}년)</summary>
        <div className="table-scroll"><table><thead><tr><th>나이</th><th>마을</th>{Object.entries(HISTORY_KEYS).map(([k, label]) => <th key={k}>{label}</th>)}</tr></thead>
          <tbody>{[...(life.history || [])].reverse().map(row => <tr key={row.age}><td>{row.age}</td><td>{TOWNS.find(t => t.id === row.town)?.name}</td>{Object.keys(HISTORY_KEYS).map(k => <td key={k}>{row[k].toLocaleString()}</td>)}</tr>)}</tbody></table></div>
      </details>
    </section>

    <section className="report-section" aria-labelledby="report-decisions"><h3 id="report-decisions">결정과 판정</h3>
      <ul className="report-numbers">
        <li><b>{stats.decisions}</b><span>선택 사건</span></li><li><b>{stats.autos}</b><span>스스로 정한 일</span></li><li><b>{stats.records}</b><span>전체 기록</span></li>
        <li><b>{stats.lasting}</b><span>여파를 남긴 선택</span></li><li><b>{stats.echoes}</b><span>돌아온 여파</span></li>
        <li><b>{stats.checks.attempted ? `${stats.checks.rate}%` : '—'}</b><span>판정 성공률 (기대 {stats.checks.expected ?? '—'}%)</span></li>
        <li><b>{battles.rate !== null ? `${battles.wins}/${battles.battles}` : '—'}</b><span>배틀 승/전</span></li>
      </ul>
      {stats.luckiest && <p className="report-luck">가장 운 좋았던 판정: {stats.luckiest.age}세 「{formatText(stats.luckiest.title, life, stats.luckiest)}」 성공률 {stats.luckiest.resolution.check.chance}%에서 성공</p>}
      {stats.unluckiest && <p className="report-luck">가장 아까웠던 판정: {stats.unluckiest.age}세 「{formatText(stats.unluckiest.title, life, stats.unluckiest)}」 성공률 {stats.unluckiest.resolution.check.chance}%에서 실패</p>}
      <div className="report-columns">
        <div><h4>사건 종류</h4><Bars label="사건 종류별 선택 수" items={stats.byCategory}/></div>
        <div><h4>선택이 쌓은 성향</h4><Bars label="성향별 선택 수" items={stats.byTone}/></div>
      </div>
    </section>

    <section className="report-section" aria-labelledby="report-places"><h3 id="report-places">머문 곳</h3>
      <Bars label="지방별 거주 햇수" items={lived.regions.map(r => ({ id: r.id, label: r.name, count: r.years }))}/>
      <p className="report-note">{lived.towns.slice(0, 6).map(t => `${t.name} ${t.years}년`).join(' · ')}</p>
    </section>

    <section className="report-section" aria-labelledby="report-companions"><h3 id="report-companions">동료 이야기</h3>
      {members.length ? <>
        <div className="member-picker" role="tablist" aria-label="동료 선택">{members.map(m => <button key={m.uid} role="tab" aria-selected={selected === m.uid} onClick={() => setMember(m.uid)} data-in-party={life.party.includes(m)}>
          <img className="pixel" src={sprite(m.id, m.shiny)} alt=""/><span>{m.nickname || pokemonName(m.id)}</span><small>Lv.{xpLevel(m)}</small></button>)}</div>
        <MemberStory key={selected} life={life} uid={selected} onRename={onRename}/>
      </> : <p className="report-note">아직 함께하는 포켓몬이 없습니다.</p>}
    </section>

    <section className="report-section" aria-labelledby="report-stage"><h3 id="report-stage">리본과 배틀 시설</h3>
      <table className="ribbon-grid"><caption>콘테스트 리본 {ribbonCount(life)}개</caption>
        <thead><tr><th>부문</th>{CONTEST_RANKS.map(r => <th key={r}>{r}</th>)}</tr></thead>
        <tbody>{Object.entries(CONTEST_CATEGORIES).map(([id, c]) => <tr key={id}><th>{c.name}</th>{CONTEST_RANKS.map((r, rank) => <td key={r} data-earned={Boolean(life.flags[ribbonFlag(id, rank)])}>{life.flags[ribbonFlag(id, rank)] ? '●' : '○'}</td>)}</tr>)}</tbody></table>
      <ul className="symbol-list" aria-label="배틀프런티어 심볼">{FACILITIES.map(f => <li key={f.id} data-tier={life.flags[symbolFlag(f.id, 1)] ? 'gold' : life.flags[symbolFlag(f.id, 0)] ? 'silver' : 'none'}>{f.name} <b>{life.flags[symbolFlag(f.id, 1)] ? '골드' : life.flags[symbolFlag(f.id, 0)] ? '실버' : '—'}</b></li>)}</ul>
      <ul className="facility-list" aria-label="지방 배틀 시설">{REGION_FACILITIES.map(f => <li key={f.id} data-tier={facilityTier(life, f.id)}>{REGIONS.find(r => r.id === f.region)?.name} {f.name} <b>{facilityTier(life, f.id)}/3</b></li>)}</ul>
    </section>

    {(life.rules?.length > 0 || life.perks?.length > 0) && <section className="report-section"><h3>이 삶의 규칙과 가문 혜택</h3>
      <ul className="rule-list">{(life.rules || []).map(id => <li key={id} data-kind="rule"><b>{RULES[id].name}</b> {RULES[id].detail}</li>)}
        {(life.perks || []).map(id => <li key={id} data-kind="perk"><b>{PERKS[id].name}</b> {PERKS[id].detail}</li>)}</ul></section>}

    <section className="report-section" aria-labelledby="report-chronicle"><h3 id="report-chronicle">세계와 사람들의 연대기</h3>
      <label className="chronicle-filter">지방<select value={region} onChange={e => { setRegion(e.target.value); setShown(40); }}>
        <option value="all">모든 지방</option>{REGIONS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
      <ol className="chronicle">{news.slice(0, shown).map(n => <li key={n.id} data-kind={n.kind}><span className="chronicle-age">{n.age}세</span>
        <b>{formatText(n.title, life, n.entry)}</b><p>{formatText(n.body, life, n.entry)}</p></li>)}</ol>
      {!news.length && <p className="report-note">기록된 소식이 없습니다.</p>}
      {news.length > shown && <button className="load-more" onClick={() => setShown(n => n + 40)}>더 보기 ({news.length - shown}개 남음)</button>}
    </section>
  </section>;
}
