// Party management: line-up mode, pins, lead and moves between party and PC box.
// All rules live in sim/party.js; this component only calls the engine functions passed in.
import { useState } from 'react';
import { ArrowDown, ArrowUp, Crown, Lock, Pin, PinOff, Repeat } from 'lucide-react';
import { PARTY_LIMIT, PARTY_MODES, partyPlan } from '../sim/party.js';
import { xpLevel } from '../sim/battle.js';
import { Modal } from './common.jsx';
import { sprite } from './assets.js';
import { pokemonName } from './format.js';
import { josa } from '../sim/text.js';

const ORIGINS = { partner: '첫 파트너', wild: '야생', adopted: '입양', starter: '연구소', legend: '전설', egg: '알', gift: '선물', rescued: '구조' };

function MemberInfo({ member, life }) {
  return <span className="pm-info">
    <img className="pixel" src={sprite(member.id, member.shiny)} alt=""/>
    <span><b>{pokemonName(member.id)}</b> <small>Lv.{xpLevel(member)}</small>
      <small className="pm-meta">{ORIGINS[member.origin] || '동료'} · 친밀도 {member.affection} · {life.age - member.joined}년</small></span>
  </span>;
}

export function PartyManager({ life, onMode, onPin, onMove, onLead, onClose }) {
  const [incoming, setIncoming] = useState(null); // a boxed member waiting for a swap partner
  const plan = partyPlan(life), full = life.party.length >= PARTY_LIMIT;
  const bring = uid => full ? setIncoming(uid) : onMove(uid);
  const swap = uid => { onMove(incoming, uid); setIncoming(null); };
  return <Modal title="파티 관리" onClose={onClose} className="party-manager">
    <header className="pm-heading"><span className="eyebrow">PARTY &amp; PC BOX</span><h2>파티 관리</h2><p>함께할 동료를 고르고, 다음 모험을 준비하세요.</p></header>
    <fieldset className="pm-mode"><legend>편성 방식</legend>
      {Object.entries(PARTY_MODES).map(([id, label]) => <label key={id} data-active={plan.mode === id}>
        <input type="radio" name="party-mode" value={id} checked={plan.mode === id} onChange={() => onMode(id)}/>
        <span><b>{label}</b><small>{id === 'auto' ? '캐릭터가 성향에 따라 매년 파티를 다시 짭니다. 고정한 포켓몬은 빼지 않습니다.' : '직접 고른 파티를 그대로 둡니다. 새 포켓몬은 PC 박스로 갑니다.'}</small></span>
      </label>)}
    </fieldset>
    <p className="pm-rule">전설의 포켓몬은 언제나 파티에 있습니다. 선두는 상성이 크게 불리하지 않으면 먼저 나서고 배틀 경험치를 받습니다. 박스의 포켓몬도 연간 경험치의 25%를 받습니다.</p>

    <section className="pm-party" aria-label={`파티 ${life.party.length}/${PARTY_LIMIT}`}>
      <h3>파티 <small>{life.party.length}/{PARTY_LIMIT}</small></h3>
      {incoming && <p className="pm-swap-hint" role="status">{josa(pokemonName(life.box.find(m => m.uid === incoming)?.id), '과', '와')} 교체할 파티 포켓몬을 고르세요. <button className="text-button" onClick={() => setIncoming(null)}>취소</button></p>}
      <ol>{life.party.map((m, i) => {
        const pinned = plan.pinned.includes(m.uid);
        return <li key={m.uid} className="pm-member" data-lead={i === 0} data-pinned={pinned} data-locked={Boolean(m.locked)}>
          <MemberInfo member={m} life={life}/>
          <span className="pm-tags">{i === 0 && <em className="pm-tag lead"><Crown size={11}/> 선두</em>}{m.locked && <em className="pm-tag locked"><Lock size={11}/> 전설</em>}{pinned && <em className="pm-tag pinned"><Pin size={11}/> 고정</em>}</span>
          <span className="pm-actions">
            {incoming ? <button disabled={m.locked} onClick={() => swap(m.uid)}><Repeat size={13}/> 교체</button> : <>
              {i > 0 && <button onClick={() => onLead(m.uid)}><ArrowUp size={13}/> 선두로</button>}
              {!m.locked && <button onClick={() => onPin(m.uid)} aria-pressed={pinned}>{pinned ? <><PinOff size={13}/> 고정 해제</> : <><Pin size={13}/> 고정</>}</button>}
              {!m.locked && life.party.length > 1 && <button onClick={() => onMove(m.uid)}><ArrowDown size={13}/> 박스로</button>}
            </>}
          </span>
        </li>;
      })}</ol>
    </section>

    <section className="pm-box" aria-label={`PC 박스 ${life.box.length}마리`}>
      <h3>PC 박스 <small>{life.box.length}마리</small></h3>
      {life.box.length ? <ul>{[...life.box].sort((a, b) => xpLevel(b) - xpLevel(a) || a.uid - b.uid).map(m => <li key={m.uid} className="pm-member boxed" data-selected={incoming === m.uid}>
        <MemberInfo member={m} life={life}/>
        <span className="pm-actions"><button onClick={() => bring(m.uid)} aria-pressed={incoming === m.uid}><ArrowUp size={13}/> {full ? '파티와 교체' : '파티로'}</button></span>
      </li>)}</ul> : <p className="pm-empty">PC 박스가 비어 있습니다.</p>}
    </section>
  </Modal>;
}
