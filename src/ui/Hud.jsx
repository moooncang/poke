// Trainer console: presentation of existing summary values, goal control and party access.
// Public class names and data states follow docs/DESIGN-HANDOFF.md.
import { Lock, Pin, Users } from 'lucide-react';
import { stageOf } from '../engine.js';
import { badgeCount, championships, xpLevel } from '../sim/battle.js';
import { GOALS, goalOf } from '../sim/goals.js';
import { PARTY_LIMIT, partyPlan } from '../sim/party.js';
import { sprite, asset } from './assets.js';
import { pokemonName } from './format.js';

export const HUD_STATS = { vitality: '건강', joy: '행복', courage: '용기', wisdom: '지식', bond: '유대' };
const level = value => value < 35 ? 'low' : value > 65 ? 'high' : 'mid';

export function TrainerHud({ life, onParty, onGoal }) {
  const plan = partyPlan(life);
  const slots = Array.from({ length: PARTY_LIMIT }, (_, i) => life.party[i] || null);
  return <section className="hud" aria-label="트레이너 요약">
    <div className="hud-identity">
      <span className="hud-avatar"><img className="pixel" src={asset(life.gender === 'female' ? 'assets/trainers/leaf.png' : 'assets/trainers/red.png')} alt=""/></span>
      <div className="hud-identity-text"><span className="hud-kicker">TRAINER STATUS</span><b className="hud-name">{life.name}</b>
      <span className="hud-age">{life.age}세 · {stageOf(life.age)}</span></div>
    </div>
    <div className="hud-money" aria-label="소지금"><span>소지금</span><b>{life.money.toLocaleString()}P</b>
      {life.ledger && <small className={life.ledger.income >= life.ledger.expense ? 'hud-ledger up' : 'hud-ledger down'}>
        {life.ledger.income - life.ledger.expense >= 0 ? '+' : ''}{(life.ledger.income - life.ledger.expense).toLocaleString()}P/년</small>}
    </div>
    <ul className="hud-stats" aria-label="능력치">
      {Object.entries(HUD_STATS).map(([key, label]) => <li key={key} className="hud-stat" data-stat={key} data-level={level(life.stats[key])}>
        <span>{label}</span><b>{life.stats[key]}</b><meter min="0" max="100" low="35" high="65" optimum="80" value={life.stats[key]} aria-label={`${label} ${life.stats[key]}`}/>
      </li>)}
    </ul>
    <div className="hud-league" aria-label="배지와 타이틀">
      <span className="hud-badges">배지 <b>{badgeCount(life)}</b></span>
      <span className="hud-titles" data-count={championships(life)}>챔피언 <b>{championships(life)}</b></span>
      <span className="hud-reputation">명성 <b>{life.reputation}</b></span>
    </div>
    <label className="hud-goal"><span>삶의 목표</span>
      <select value={goalOf(life)} onChange={e => onGoal(e.target.value)} disabled={life.ended} aria-label="삶의 목표">
        {Object.entries(GOALS).map(([id, g]) => <option key={id} value={id}>{g.name}</option>)}
      </select>
    </label>
    <button className="hud-party" onClick={onParty} aria-label={`파티 관리 · ${life.party.length}마리 · ${plan.mode === 'manual' ? '직접 편성' : '캐릭터가 편성'}`}>
      <span className="hud-party-slots">{slots.map((m, i) => m
        ? <span key={m.uid} className="hud-slot" data-lead={i === 0} data-pinned={plan.pinned.includes(m.uid)} data-locked={Boolean(m.locked)} title={`${pokemonName(m.id)} Lv.${xpLevel(m)}`}>
            <img className="pixel" src={sprite(m.id, m.shiny)} alt=""/><small>{xpLevel(m)}</small>
            {m.locked ? <Lock size={9} aria-hidden="true"/> : plan.pinned.includes(m.uid) ? <Pin size={9} aria-hidden="true"/> : null}
          </span>
        : <span key={`empty-${i}`} className="hud-slot empty" aria-hidden="true"/>)}</span>
      <span className="hud-party-label"><Users size={13}/> {plan.mode === 'manual' ? '직접 편성' : '자동 편성'} · 박스 {life.box.length}</span>
    </button>
  </section>;
}
