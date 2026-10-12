// Trainer console: presentation of existing summary values, goal control and party access.
// Public class names and data states follow docs/DESIGN-HANDOFF.md.
import { PixelIcon, conditionIcon } from './PixelIcon.jsx';
import { stageOf } from '../engine.js';
import { badgeCount, championships, xpLevel } from '../sim/battle.js';
import { GOALS, goalOf } from '../sim/goals.js';
import { PARTY_LIMIT, partyPlan } from '../sim/party.js';
import { standingOf, infamyOf, debtOf, inPrison, isWanted } from '../sim/standing.js';
import { sprite, asset } from './assets.js';
import { pokemonName } from './format.js';

export const HUD_STATS = { vitality: '건강', joy: '행복', courage: '용기', wisdom: '지식', bond: '유대' };
const level = value => value < 35 ? 'low' : value > 65 ? 'high' : 'mid';

/**
 * `deltas` (optional): changes since the last player decision, { joy: +3, money: -200, … } — shown as badges.
 * `onSkip` (optional): fast-forward to the next decision.
 */
export function TrainerHud({ life, onParty, onGoal, deltas = {}, onSkip }) {
  const plan = partyPlan(life);
  const standing = standingOf(life);
  const delta = key => deltas[key] ? <small className="hud-delta" data-sign={deltas[key] > 0 ? 'up' : 'down'}>{deltas[key] > 0 ? '+' : ''}{key === 'money' ? `${deltas[key].toLocaleString()}P` : deltas[key]}</small> : null;
  const slots = Array.from({ length: PARTY_LIMIT }, (_, i) => life.party[i] || null);
  return <section className="hud" aria-label="트레이너 요약">
    <div className="hud-identity">
      <span className="hud-avatar"><img className="pixel" src={asset(life.gender === 'female' ? 'assets/trainers/leaf.png' : 'assets/trainers/red.png')} alt=""/></span>
      <div className="hud-identity-text"><span className="hud-kicker">TRAINER STATUS</span><b className="hud-name">{life.name}</b>
      <span className="hud-age">{life.age}세 · {stageOf(life.age)}</span></div>
    </div>
    <div className="hud-money" aria-label="소지금"><span><PixelIcon name="money"/> 소지금</span><b>{life.money.toLocaleString()}P{delta('money')}</b>
      <span className="hud-balls"><PixelIcon name="ball"/> 몬스터볼 <b>{life.game.balls}</b></span>
      {debtOf(life) > 0 && <small className="hud-debt">빚 {Math.round(debtOf(life)).toLocaleString()}P</small>}
      {life.ledger && <small className={life.ledger.income >= life.ledger.expense ? 'hud-ledger up' : 'hud-ledger down'}>
        {life.ledger.income - life.ledger.expense >= 0 ? '+' : ''}{(life.ledger.income - life.ledger.expense).toLocaleString()}P/년</small>}
    </div>
    <ul className="hud-stats" aria-label="능력치">
      {Object.entries(HUD_STATS).map(([key, label]) => <li key={key} className="hud-stat" data-stat={key} data-level={level(life.stats[key])}>
        <span title={label}><PixelIcon name={`stat-${key}`} size={24}/><span>{label}</span></span><b>{life.stats[key]}{delta(key)}</b><meter min="0" max="100" low="35" high="65" optimum="80" value={life.stats[key]} aria-label={`${label} ${life.stats[key]}`}/>
      </li>)}
    </ul>
    <div className="hud-league" aria-label="배지와 타이틀">
      <span className="hud-badges"><PixelIcon name="league-card"/>배지 <b>{badgeCount(life)}</b></span>
      <span className="hud-titles" data-count={championships(life)}><PixelIcon name="champion-crown"/>챔피언 <b>{championships(life)}</b></span>
      <span className="hud-reputation"><PixelIcon name="reputation"/>명성 <b>{life.reputation}{delta('reputation')}</b></span>
      {infamyOf(life) > 0 && <span className="hud-infamy" data-value={infamyOf(life)}><PixelIcon name="infamy"/>악명 <b>{infamyOf(life)}{delta('infamy')}</b></span>}
    </div>
    {(standing.conditions.length > 0 || onSkip) && <div className="hud-status" aria-label="현재 상태">
      {standing.conditions.map(c => <span key={c} className="hud-badge" data-kind={inPrison(life) && c.startsWith('복역') ? 'prison' : isWanted(life) && c === '수배 중' ? 'wanted' : c.startsWith('빚') ? 'debt' : 'outlaw'}><PixelIcon name={conditionIcon(c)}/>{c}</span>)}
      {onSkip && <button className="hud-skip" onClick={onSkip} disabled={life.ended || Boolean(life.pending) || Boolean(life.encounter)} title="단축키 F">다음 선택까지 ▶▶</button>}
    </div>}
    <label className="hud-goal"><span><PixelIcon name={`goal-${goalOf(life)}`}/> 삶의 목표</span>
      <select value={goalOf(life)} onChange={e => onGoal(e.target.value)} disabled={life.ended} aria-label="삶의 목표">
        {Object.entries(GOALS).map(([id, g]) => <option key={id} value={id}>{g.name}</option>)}
      </select>
    </label>
    <button className="hud-party" onClick={onParty} aria-label={`파티 관리 · ${life.party.length}마리 · ${plan.mode === 'manual' ? '직접 편성' : '캐릭터가 편성'}`}>
      <span className="hud-party-slots">{slots.map((m, i) => m
        ? <span key={m.uid} className="hud-slot" data-lead={i === 0} data-pinned={plan.pinned.includes(m.uid)} data-locked={Boolean(m.locked)} title={`${pokemonName(m.id)} Lv.${xpLevel(m)}`}>
            <img className="pixel" src={sprite(m.id, m.shiny)} alt=""/><small>{xpLevel(m)}</small>
            {i === 0 && <PixelIcon name="crown-lead" className="slot-crown"/>}{m.locked ? <PixelIcon name="lock" className="slot-mark"/> : plan.pinned.includes(m.uid) ? <PixelIcon name="pin" className="slot-mark"/> : null}
          </span>
        : <span key={`empty-${i}`} className="hud-slot empty" aria-hidden="true"><PixelIcon name="ball-empty" size={24}/></span>)}</span>
      <span className="hud-party-label"><PixelIcon name="event-party"/> {plan.mode === 'manual' ? '직접 편성' : '자동 편성'} · 박스 {life.box.length}</span>
    </button>
  </section>;
}
