import { talentLabel, talentBonus, TALENT_FIELDS } from '../sim/talent.js';
import { ArrowRight, BookOpen, Download, Heart, Lock, RotateCcw, Sprout } from 'lucide-react';
import { GENDERS, STAT_LABELS, successChance, townOf, toneOf } from '../engine.js';
import { TOWNS } from '../data/world.js';
import { DISPOSITIONS } from '../sim/party.js';
import { POKEMON, sprite, artwork } from './assets.js';
import { Modal, PokeBall, EffectChips } from './common.jsx';
import { formatText, pokemonName } from './format.js';

function GenderSelect({ value, onChange, label }) {
  return <select aria-label={label} value={value} onChange={e => onChange(e.target.value)}>
    {Object.entries(GENDERS).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
  </select>;
}

export function BirthModal({ life, onGender, onStart }) {
  const town = townOf(life);
  return <Modal title="출생 배정 결과" className="birth-modal"><div className="birth-report">
    <PokeBall/><span className="eyebrow">A NEW POKÉMON LIFE</span>
    <h2>{life.name}의 출생 기록</h2>
    <p className="birth-location">{town.region}지방 · {town.name}</p>
    <dl>
      <dt>성별</dt><dd><GenderSelect label="플레이어 성별" value={life.gender} onChange={onGender}/></dd>
      <dt>가족 구성</dt><dd>{life.family}</dd>
      <dt>경제적 형편</dt><dd>{life.background.wealth}</dd>
      <dt>주거 형태</dt><dd>{life.background.home}</dd>
      <dt>주변 환경</dt><dd>{life.background.environment}</dd>
      <dt>소꿉친구</dt><dd>{life.cast.friend.name}</dd>
      <dt>타고난 재능</dt><dd>{talentLabel(life)}</dd>
      <dt>타고난 성향</dt><dd>{life.trait}</dd>
      <dt>시작 소지금</dt><dd>{life.money.toLocaleString()} P</dd>
    </dl>
    <p>배정된 환경에서 삶이 자동으로 진행됩니다.<br/>세계와 주변 사람들도 저마다 변해 갑니다. 사건이 생기면 선택지를 골라 주세요.</p>
    <button className="primary-button wide" onClick={onStart}>이 삶 시작하기 <ArrowRight size={16}/></button>
  </div></Modal>;
}

function ChoiceDetail({ life, choice }) {
  const lasting = choice.follow?.length || choice.after || choice.challenge?.failure?.follow;
  return <>
    {choice.challenge ? <div className="chance-preview">
      <strong>성공 확률 {successChance(life, choice)}% · {STAT_LABELS[choice.challenge.stat]} {life.stats[choice.challenge.stat]}</strong>
      {choice.challenge.talent && <small>재능 적용 분야: {TALENT_FIELDS[choice.challenge.talent].name}</small>}
      {talentBonus(life, choice)>0 && <small>재능·숙련 보정 +{talentBonus(life, choice)}%p 반영 · 최종 상한 95%</small>}
      <small>성공: {formatText(choice.outcome, life)}</small><EffectChips effects={choice.effects} world={choice.world}/>
      <small>실패: {formatText(choice.challenge.failure.outcome, life)}</small><EffectChips effects={choice.challenge.failure.effects} world={choice.challenge.failure.world}/>
      {choice.cost > 0 && <small>성공 여부와 관계없이 {choice.cost}P 사용</small>}
    </div> : <>
      <small className="certain-result">확정 효과{choice.battle || choice.simulation ? ' · 배틀·포획 결과는 별도 판정' : ''}</small>
      <EffectChips effects={choice.effects} world={choice.world}/>
    </>}
    <span className="choice-tags">
      <em>{DISPOSITIONS[toneOf(choice)]}</em>
      {lasting && <em className="lasting">여파 있음</em>}
      {choice.join && <em>파티 합류{life.party.length >= 6 ? ' · 자동 재편성' : ''}</em>}
    </span>
  </>;
}

export function DecisionModal({ life, entry, onChoose, onHide }) {
  return <Modal key={entry.id} title="행동 선택" onClose={onHide} className="decision-modal">
    <div className="decision-banner"><span>DECISION REQUIRED</span><b>{life.age}세 · {townOf(life).name}</b></div>
    <div className="decision-body">
      <button className="secondary-button decision-hide" onClick={onHide}>잠깐 숨기고 화면 보기</button>
      <span className="eyebrow">{entry.echo ? '지난 선택의 여파' : '새로운 사건'} · 선택 후 진행</span>
      <h2>{formatText(entry.title, life, entry)}</h2>
      <p>{formatText(entry.body, life, entry)}</p>
      <div className="decision-options">{entry.choices.map((c, i) =>
        <button key={`${entry.id}-${i}`} disabled={(c.cost || 0) > life.money} onClick={() => onChoose(i)}>
          <span className="decision-number">{String(i + 1).padStart(2, '0')}</span>
          <span><b>{formatText(c.label, life)}</b><small>{(c.cost || 0) > life.money ? '소지금 부족' : formatText(c.description, life)}</small><ChoiceDetail life={life} choice={c}/></span>
          <ArrowRight size={17}/>
        </button>)}</div>
      <div className="decision-foot">소지금 {life.money.toLocaleString()}P <span>성향 태그는 이 선택이 캐릭터의 성격을 어느 쪽으로 기울이는지 보여 줍니다.</span></div>
    </div>
  </Modal>;
}

export function NewLifeModal({ life, form, setForm, onSubmit, onClose, onDownload }) {
  const update = key => e => setForm(f => ({ ...f, [key]: e.target.value }));
  return <Modal title="새로운 삶 시작하기" onClose={onClose}><form onSubmit={onSubmit} className="new-life-form">
    <span className="modal-emblem"><Sprout size={28}/></span><span className="eyebrow">NEW GAME</span>
    <h2>트레이너 생성</h2><p>이름을 입력하고 무작위로 배정된 환경에서 시작합니다.</p>
    <label>당신의 이름<input autoComplete="off" maxLength={12} placeholder="하루" value={form.name} onChange={update('name')}/></label>
    <label>플레이어 성별<select value={form.gender} onChange={update('gender')}><option value="random">무작위</option>{Object.entries(GENDERS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    <div className="birth-random-note">출신 지방 · 가족 구성 · 경제적 형편 · 주거 환경 · 각 지방의 정세는 새 삶이 시작될 때 무작위로 배정됩니다.</div>
    <details><summary>시드 설정</summary>
      <label>게임 시드<input placeholder="비워두면 무작위 생성" maxLength={40} value={form.seed} onChange={update('seed')}/></label>
      <small>같은 시드·선택 순서는 같은 진행을 재현합니다.</small>
    </details>
    {life.age > 0 && <div className="replace-note"><p>현재 이야기를 새 삶으로 교체합니다. 간직하고 싶다면 먼저 내려받아 주세요.</p>
      <button type="button" className="text-button" onClick={onDownload}><Download size={13}/> 현재 이야기 내려받기</button></div>}
    <button className="primary-button wide" type="submit">게임 시작 <ArrowRight size={17}/></button>
  </form></Modal>;
}

function Toggle({ on, onClick, label }) {
  return <button className={`toggle ${on ? 'on' : ''}`} onClick={onClick} role="switch" aria-checked={on} aria-label={label}><i/></button>;
}

export function SettingsModal({ life, prefs, notice, onGender, onSound, setPref, onDownload, onImport, fileRef, onClose }) {
  return <Modal title="게임 설정" onClose={onClose}><div className="settings-content">
    <span className="eyebrow">GAME SETTINGS</span><h2>게임 설정</h2><p>플레이어 정보·자동 진행·저장 데이터를 관리합니다.</p>
    <div className="setting-row"><span><b>플레이어 성별</b><small>능력치나 진로에는 영향을 주지 않습니다.</small></span><GenderSelect label="플레이어 성별 변경" value={life.gender} onChange={onGender}/></div>
    <div className="setting-row"><span><b>만남의 소리</b><small>특별한 만남에 짧은 음악이 흐릅니다.</small></span><Toggle on={prefs.sound} onClick={onSound} label="만남의 소리"/></div>
    <div className="setting-row"><span><b>자동 결정</b><small>캐릭터가 자신의 성향과 성공 가능성을 보고 스스로 고릅니다.</small></span><Toggle on={prefs.autoDecisions} onClick={() => setPref('autoDecisions', !prefs.autoDecisions)} label="자동 선택"/></div>
    <div className="setting-row"><span><b>자동 진행 속도</b><small>특별한 만남에서는 언제나 잠시 멈춥니다.</small></span>
      <select aria-label="자동 진행 속도" value={prefs.speed} onChange={e => setPref('speed', Number(e.target.value))}>{[1, 2, 3, 4, 16].map(n => <option key={n} value={n}>{n}×</option>)}</select></div>
    <div className="settings-storage"><h3>저장 데이터 관리</h3>
      <p>진행 상황은 이 브라우저에 저장됩니다. 다른 기기로 옮기거나 브라우저 데이터를 지우기 전에는 기록을 내려받아 주세요.</p>
      <button className="secondary-button" onClick={onDownload}><Download size={15}/> 기록 내려받기</button>
      <button className="secondary-button" onClick={() => fileRef.current?.click()}><BookOpen size={15}/> 기록 불러오기</button>
      <input hidden ref={fileRef} type="file" accept="application/json,.json" onChange={onImport}/>
      {notice && <p className="form-notice" role="status">{notice}</p>}
    </div>
  </div></Modal>;
}

export function PokemonModal({ life, id, onClose }) {
  const p = POKEMON[id], member = [...life.party, ...life.box].find(m => m.id === id);
  const inParty = life.party.some(m => m.id === id);
  return <Modal title={`${p?.name} 도감`} onClose={onClose}><div className="pokemon-detail">
    <span className="eyebrow">POKÉDEX ENTRY</span><img src={artwork(id)} alt={p?.name}/>
    <span className="dex-number">No. {String(id).padStart(4, '0')}</span><h2>{p?.name}</h2>
    <span className="type-label">{p?.genus} · {p?.types.join(' / ')}</span>
    <p>{p?.description || '한국어 도감 설명이 없습니다.'}</p>
    {member && <div className="detail-bond">{member.locked ? <Lock size={15}/> : <Heart size={15}/>} {inParty ? '현재 파티에 편성되어 있습니다.' : 'PC 박스에 맡겨 두었습니다.'} 친밀도 {member.affection}{member.locked ? ' · 전설의 포켓몬은 파티에 고정' : ''}</div>}
  </div></Modal>;
}

export { EndingModal } from './Ending.jsx';

export function AboutModal({ onClose }) {
  return <Modal title="게임 정보" onClose={onClose}><div className="about-content">
    <span className="eyebrow">GAME INFORMATION</span><h2>Pokélife 게임 정보</h2>
    <p>Pokélife는 포켓몬 세계에서 한 사람의 평생을 지켜보는 비공식 팬 시뮬레이션입니다. 일상 기록이 자동으로 쌓이고 기록 4~7개 사이에 선택창이 나타납니다.</p>
    <p>정해진 나이에 오는 사건은 학습 방식과 첫 진로뿐입니다. 나머지는 9개 지방의 경기·치안·생태, 소꿉친구·라이벌·가족의 삶, 캐릭터의 성향과 명성, 그리고 몇 년 전의 선택에 따라 그때그때 달라집니다.</p>
    <p>포켓몬이 6마리를 넘으면 캐릭터가 성향에 맞춰 스스로 파티를 다시 짜고 나머지는 PC 박스에 맡깁니다. 전설의 포켓몬은 손에 넣으면 언제나 파티에 둡니다.</p>
    <p>공식 지명과 캐릭터를 바탕으로 하되 인생 사건, 대사, 확률, 인간관계는 이 작품을 위해 창작했습니다. 타입 상성은 원작 자료를 사용합니다. 배틀 수치·장비 해금·진화 조건 단순화는 이 게임의 규칙입니다.</p>
    <h3>이 세계를 만드는 데 도움을 준 자료</h3>
    <p><a href="https://github.com/PokeAPI/pokeapi" target="_blank" rel="noreferrer">PokéAPI 데이터</a> · <a href="https://github.com/PokeAPI/sprites" target="_blank" rel="noreferrer">PokéAPI / 커뮤니티 스프라이트</a> · <a href="https://github.com/pret" target="_blank" rel="noreferrer">pret 지도·인물 자료</a></p>
    <p className="content-note">Pokémon 및 관련 이미지·명칭의 권리는 각 권리자에게 있습니다. Nintendo, Creatures, GAME FREAK와 제휴하지 않았습니다. 최신 세대 일부 도트는 커뮤니티 제작 자료입니다.</p>
    <p className="content-note">운영체제의 ‘동작 줄이기’ 설정을 존중합니다. 소리는 기본적으로 꺼져 있습니다.</p>
  </div></Modal>;
}
