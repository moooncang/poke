// The character card: who this person is right now — job and rank, where they live, social standing, family,
// goal and any conditions (debt, wanted, prison). Replaces the licence header of the trainer sidebar.
// Class names and data-* states: docs/DESIGN-HANDOFF.md part 3.
import { PixelIcon, conditionIcon } from './PixelIcon.jsx';
import { GENDERS } from '../engine.js';
import { TOWNS, CAREERS } from '../data/world.js';
import { GOALS, goalOf } from '../sim/goals.js';
import { epithet } from '../sim/achievements.js';
import { standingOf, careerTitle, infamyOf, isOutlaw, isWanted, inPrison, debtOf, syndicateName } from '../sim/standing.js';
import { championships, badgeCount } from '../sim/battle.js';
import { asset } from './assets.js';
import { difficultyOf, difficultyName } from '../sim/difficulty.js';

const RELATIONSHIP = { single: '독신', friends: '친구 사이', dating: '교제 중', engaged: '약혼', married: '기혼' };

export function CharacterCard({ life }) {
  const town = TOWNS.find(t => t.id === life.town), hometown = TOWNS.find(t => t.id === life.hometown);
  const standing = standingOf(life);
  const years = (life.history || []).filter(r => r.town === life.town).length;
  const rel = life.relationship;
  const mood = inPrison(life) ? 'prison' : isWanted(life) ? 'wanted' : isOutlaw(life) ? 'outlaw' : debtOf(life) > 0 ? 'debt' : 'normal';
  return <section className="character-card" data-mood={mood} data-career={life.career || 'none'} aria-label="인물 카드">
    <header className="cc-head">
      <img className="pixel cc-portrait" src={asset(life.gender === 'female' ? 'assets/trainers/leaf.png' : 'assets/trainers/red.png')} alt=""/>
      <div className="cc-identity">
        <span className="cc-epithet">{epithet(life)}</span>
        <h2 className="cc-name">{life.name}</h2>
        <span className="cc-age">{life.age}세 · {GENDERS[life.gender]}{life.heritage ? ` · ${life.heritage.generation}대째` : ''} · <span className="cc-difficulty" data-difficulty={difficultyOf(life)}>{difficultyName(life)}</span></span>
      </div>
    </header>
    {standing.conditions.length > 0 && <ul className="cc-conditions" aria-label="현재 상태">
      {standing.conditions.map(c => <li key={c} className="cc-condition"><PixelIcon name={conditionIcon(c)}/>{c}</li>)}
    </ul>}
    <dl className="cc-facts">
      <dt>하는 일</dt><dd className="cc-job"><PixelIcon name={`job-${life.career || 'traveler'}`}/> {life.career ? <><b>{careerTitle(life)}</b> · {isOutlaw(life) ? syndicateName(life) : CAREERS[life.career].name}
        {life.work.retired ? ' · 은퇴' : ` · ${life.work.years}년차 · 만족 ${life.work.satisfaction}`}</> : <b>자율 활동</b>}</dd>
      <dt>사는 곳</dt><dd className="cc-place">{town.region} · {town.name}{years > 0 ? ` · ${years}년째` : ' · 올해 이주'}{life.town !== life.hometown ? <small> (고향 {hometown.region} {hometown.name})</small> : <small> (고향)</small>}</dd>
      <dt>세상의 평가</dt><dd className="cc-standing"><span className="cc-reputation" data-value={life.reputation}><PixelIcon name="reputation"/>{standing.reputation} <small>명성 {life.reputation}</small><meter min="0" max="100" value={life.reputation} aria-label={`명성 ${life.reputation}`}/></span>
        {standing.infamy && <span className="cc-infamy" data-value={infamyOf(life)}><PixelIcon name="infamy"/>{standing.infamy} <small>악명 {infamyOf(life)}</small><meter min="0" max="100" value={infamyOf(life)} aria-label={`악명 ${infamyOf(life)}`}/></span>}</dd>
      <dt>배지 · 타이틀</dt><dd><PixelIcon name="league-card"/> 배지 {badgeCount(life)} · 챔피언 {championships(life)}</dd>
      <dt>가족</dt><dd>{RELATIONSHIP[rel.status]}{rel.status !== 'single' ? ` · ${rel.name}(${GENDERS[rel.gender] || '?'})` : ''}{rel.children ? ` · 자녀 ${rel.children}` : ''}</dd>
      <dt>삶의 목표</dt><dd><PixelIcon name={`goal-${goalOf(life)}`}/> {GOALS[goalOf(life)].name}</dd>
      <dt>가족 형편</dt><dd>{life.family} · {life.background.wealth}</dd>
    </dl>
  </section>;
}
