import {LifeScene,LifeSidebar,LifeAtlas} from './LifeView.jsx';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Bookmark, BookOpen, Check, ChevronDown, ChevronRight, Compass, Download, Feather, Heart, Home, Leaf, Map, MapPin, Pause, Play, Plus, RotateCcw, Search, Settings2, Shield, Sparkles, Sprout, Sun, Users, Volume2, VolumeX, Wallet, Wind, X } from 'lucide-react';
import { TOWNS, CAREERS, NPCS, SEASONS } from './data/world.js';
import { SAVE_KEY, GENDERS, STAT_LABELS, successChance, createLife, advance, choose, acknowledge, toggleMemory, autoChoice, parseSave, townOf, partnerOf, stageOf } from './engine.js';
import { POKEMON, asset, sprite, artwork, PokeBall, Landscape, Modal, Encounter, playChime } from './components.jsx';

const OPTIONS_KEY = 'pokelife.preferences.v1';
const NAV = [{ id: 'story', label: '게임 화면', icon: BookOpen }, { id: 'pokemon', label: '포켓몬 도감', icon: PokeBall }, { id: 'memories', label: '주요 기록', icon: Bookmark }, { id: 'map', label: '여행 기록', icon: Map }];
function initial() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const saved = raw && parseSave(raw);
    if (raw && !saved) { localStorage.setItem(`${SAVE_KEY}.recovery`, raw); return { life: createLife(), notice: '저장된 기록을 읽지 못해 새 이야기를 열었습니다. 기존 기록은 복구용으로 보관했습니다.' }; }
    return { life: saved || createLife(), notice: '' };
  } catch { return { life: createLife(), notice: '이 브라우저에서는 자동 저장을 사용할 수 없습니다. 저장 파일을 내려받아 보관하세요.' }; }
}
function options() { try { const s = JSON.parse(localStorage.getItem(OPTIONS_KEY) || '{}'); return { sound: s.sound === true, speed: [1, 2, 3, 4, 16].includes(s.speed) ? s.speed : 1, autoDecisions: s.autoDecisions === true }; } catch { return { sound: false, speed: 1, autoDecisions: false }; } }
function formatBody(text, life, entry) {
  const party = partnerOf(life);
  return text.replaceAll('{town}', TOWNS.find(t => t.id === entry?.town)?.name || townOf(life).name).replaceAll('{partner}', POKEMON[entry?.partnerId || party?.id]?.name || '파트너');
}
function download(life, text = false) {
  const body = text ? `${life.name}의 플레이 기록\n${townOf(life).region} · ${life.age}세\n\n${life.log.map(e => `${e.age}세 — ${e.title}\n${formatBody(e.body, life, e)}${e.resolution ? '\n' + e.resolution.text : ''}`).join('\n\n')}` : JSON.stringify(life, null, 2);
  const url = URL.createObjectURL(new Blob([body], { type: text ? 'text/plain;charset=utf-8' : 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = `pokelife-${life.name}-${life.age}.${text ? 'txt' : 'json'}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function EffectChips({ effects }) {
  return <div className="effect-chips">{Object.entries(effects || {}).filter(([,v]) => v).map(([k, v]) => <span key={k} className={v < 0 ? 'negative' : ''}>{k === 'money' ? '소지금' : STAT_LABELS[k]} {v > 0 ? '+' : ''}{v}{k === 'money' ? 'P' : ''}</span>)}</div>;
}

function StoryCard({ entry, life, onChoose, onMemory, onReplay, compact = false }) {
  const special = entry.encounter;
  const Icon = entry.kind === 'work' ? Compass : entry.kind === 'choice' ? Feather : special ? Sparkles : entry.kind === 'milestone' ? Sprout : Leaf;
  const title = entry.kind === 'work' ? '직업 활동' : entry.kind === 'choice' ? '선택 사건' : special ? '특별한 만남' : entry.kind === 'milestone' ? '주요 사건' : entry.kind === 'ending' ? '생애 종료' : '일반 사건';
  return <article className={`story-row ${special ? 'special-row' : ''} ${entry.kind === 'choice' && !entry.resolution ? 'choice-row' : ''}`}>
    {!compact && <div className="story-age"><b>{entry.age}</b><span>살의 {SEASONS[entry.season]}</span></div>}
    <div className="timeline-dot"><Icon size={15}/></div>
    <div className="story-card">
      <div className="story-card-top"><span className="story-category"><Icon size={12}/>{title}</span><div><span className="story-place">{TOWNS.find(t => t.id === entry.town)?.name}</span><button className={`bookmark-button ${life.memories.includes(entry.id) ? 'saved' : ''}`} onClick={() => onMemory(entry.id)} aria-label={life.memories.includes(entry.id) ? '저장 기록 해제' : '기록 저장'} aria-pressed={life.memories.includes(entry.id)}><Bookmark size={15}/></button></div></div>
      <h3>{entry.title}</h3>
      <p>{formatBody(entry.body, life, entry)}</p>
      {special && <button className={`encounter-ticket ${special.type}`} onClick={() => onReplay(special, entry.age)}><span className="ticket-portrait">{special.npc ? <img className="pixel" src={asset(`assets/trainers/${NPCS[special.npc].image}.png`)} alt=""/> : <img className="pixel" src={sprite(special.pokemonId, special.type === 'shiny')} alt=""/>}</span><span><small>{special.type === 'legendary' ? '전설의 포켓몬' : special.type === 'shiny' ? '색이 다른 포켓몬' : '특별한 만남'}</small><b>{special.npc ? NPCS[special.npc].name : POKEMON[special.pokemonId]?.name}</b></span><span className="ticket-action">다시 보기 <Play size={12}/></span></button>}
      {entry.choices && !entry.resolution && life.pending !== entry.id && <div className="choices" aria-label="삶의 선택">{entry.choices.map((choice, i) => <button key={i} disabled={(choice.cost || 0) > life.money || life.pending !== entry.id} onClick={() => onChoose(i)}><span><b>{choice.label}</b><small>{(choice.cost || 0) > life.money ? '소지금이 부족합니다' : choice.description}</small></span><ArrowUpRight size={18}/></button>)}</div>}
      {entry.resolution && <div className="choice-result"><span><Check size={13}/> {entry.resolution.label}</span>{entry.resolution.check && <strong className={`check-result ${entry.resolution.check.success?'success':'failure'}`}>{entry.resolution.check.success?'성공':'실패'} · 도전 당시 성공률 {entry.resolution.check.chance}%</strong>}<p>{entry.resolution.text}</p></div>}
      <EffectChips effects={entry.resolution?.effects || entry.effects}/>
    </div>
  </article>;
}

function Dex({ life, onPokemon }) {
  const [query, setQuery] = useState('');
  const creatures = life.seen.map(id => POKEMON[id]).filter(p => p && (p.name.includes(query) || String(p.id).includes(query)));
  return <section className="collection-content"><div className="content-title"><div><span className="eyebrow">POKÉDEX DATABASE</span><h2>포켓몬 도감</h2><p>관측한 포켓몬의 타입과 도감 정보를 확인합니다.</p></div><span className="count-badge">{life.seen.length}종</span></div><label className="search-field"><Search size={17}/><input placeholder="이름이나 도감 번호로 찾기" value={query} onChange={e => setQuery(e.target.value)} aria-label="만난 포켓몬 검색"/></label>{creatures.length ? <div className="dex-grid">{creatures.map(p => <button className="dex-card" key={p.id} onClick={() => onPokemon(p.id)}><small>No. {String(p.id).padStart(4, '0')}</small><img src={sprite(p.id)} className="pixel" alt=""/><h3>{p.name}</h3><span>{p.types.join(' · ')}</span>{life.party.some(x => x.id === p.id) && <span className="dex-companion"><Heart size={10}/> 동행 중</span>}</button>)}</div> : <div className="empty-state"><PokeBall/><h3>{query ? '아직 그 친구를 만나지 못했어요' : '첫 만남은 언제 찾아올까요?'}</h3><p>{query ? '다른 이름으로 찾아보세요.' : '이야기를 이어가면 만난 포켓몬이 이곳에 기록됩니다.'}</p></div>}</section>;
}

export default function App() {
  const [boot] = useState(initial);
  const [life, setLife] = useState(boot.life);
  const [notice, setNotice] = useState(boot.notice);
  const [prefs, setPrefs] = useState(options);
  const [running, setRunning] = useState(true);
  const [tab, setTab] = useState('story');
  const [modal, setModal] = useState(boot.life.log.length===1?'birth':null);
  const [replay, setReplay] = useState(null);
  const [detail, setDetail] = useState(null);
  const [filter, setFilter] = useState('all');
  const [shown, setShown] = useState(8);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [newName, setNewName] = useState('');
  const [newSeed, setNewSeed] = useState('');
  const [newGender, setNewGender] = useState('random');
  const [hiddenDecision, setHiddenDecision] = useState(null);
  const decisionHidden = Boolean(life.pending && hiddenDecision === life.pending);
  const hideDecision = () => { setHiddenDecision(life.pending); setRunning(false); };
  const fileRef = useRef(null);
  const overlay = life.encounter || replay || modal || detail || life.pending;
  const autoBlocked = life.encounter || replay || modal || detail || decisionHidden;
  const pendingEntry = life.log.find(e => e.id === life.pending);
  const town = townOf(life), partner = partnerOf(life);

  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(life)); setSaveStatus('saved'); }
    catch { setSaveStatus('failed'); }
  }, [life]);
  useEffect(() => { try { localStorage.setItem(OPTIONS_KEY, JSON.stringify(prefs)); } catch { /* noncritical preferences */ } }, [prefs]);
  useEffect(() => {
    if (!running || autoBlocked || life.ended || (life.pending && !prefs.autoDecisions) || document.hidden) return;
    const timer = setTimeout(() => setLife(s => s.pending ? autoChoice(s) : advance(s)), 3600 / prefs.speed);
    return () => clearTimeout(timer);
  }, [running, autoBlocked, life.log.length, life.age, life.season, life.pending, life.ended, prefs.speed, prefs.autoDecisions]);
  useEffect(() => {
    const hide = () => { if (document.hidden) setRunning(false); };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  useEffect(() => { if (life.ended) setRunning(false); }, [life.encounter, life.ended, life.pending, prefs.autoDecisions]);

  const setPref = (key, value) => setPrefs(p => ({...p, [key]: value}));
  const soundToggle = () => { if (!prefs.sound) playChime(); setPref('sound', !prefs.sound); };
  const next = () => { setTab('story'); setFilter('all'); setShown(8); setLife(advance); };
  const keep = id => setLife(s => toggleMemory(s, id));
  const replayEvent = (data, age) => { setRunning(false); setReplay({...data, age}); };
  const openModal = key => { setRunning(false); setModal(key); };
  const selectTab = id => { setTab(id); setShown(8); if (id !== 'story') setRunning(false); };
  function begin(e) {
    e.preventDefault();
    // Keep a recovery copy before replacing the current life.
    try { localStorage.setItem(`${SAVE_KEY}.previous`, JSON.stringify(life)); } catch { /* manual export remains available */ }
    setLife(createLife({ name: newName || '하루', gender: newGender, town: 'random', seed: newSeed || crypto.randomUUID() }));
    setHiddenDecision(null); setModal('birth'); setReplay(null); setTab('story'); setShown(8); setFilter('all'); setRunning(true); setNotice('');
  }
  async function importStory(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error('기록 파일이 너무 큽니다. 2MB 이하의 Pokélife 기록을 선택해 주세요.');
      const saved = parseSave(await file.text());
      if (!saved) throw new Error('호환되는 Pokélife 기록이 아닙니다. 현재 이야기는 그대로 유지됩니다.');
      try { localStorage.setItem(`${SAVE_KEY}.previous`, JSON.stringify(life)); } catch { /* manual export remains available */ }
      setLife(saved); setHiddenDecision(null); setModal(null); setTab('story'); setRunning(false); setNotice('저장 데이터를 불러왔습니다.');
    } catch (error) { setNotice(error.message || '기록을 불러오지 못했습니다.'); }
    event.target.value = '';
  }
  const logs = [...life.log].reverse().filter(e => filter === 'all' || e.encounter || e.kind === 'milestone' || e.kind === 'choice' || e.kind === 'ending');
  const activeEncounter = replay || life.encounter;

  return <>
    <div className="app-shell" inert={Boolean(overlay)}>
      <header className="site-header"><a href="#" className="brand" onClick={e => {e.preventDefault(); selectTab('story');}} aria-label="Pokélife 나의 플레이 기록"><span className="brand-icon"><PokeBall/></span><span>pokélife<span className="brand-dot">.</span></span><small>POKÉMON LIFE SIMULATOR</small></a><div className="header-right"><span className="edition-label">YOUR POKÉMON LIFE</span><button className="icon-button" onClick={soundToggle} aria-label={prefs.sound ? '소리 끄기' : '소리 켜기'}>{prefs.sound ? <Volume2 size={18}/> : <VolumeX size={18}/>}</button><button className="icon-button" onClick={() => openModal('settings')} aria-label="설정"><Settings2 size={18}/></button><button className="new-life-button" onClick={() => openModal('new')}><Plus size={15}/><span>새로운 삶</span></button></div></header>
      <div className="page-container">
        <div className="page-top"><div className="breadcrumb"><span>트레이너 시스템</span><ChevronRight size={13}/><b>{life.name}의 플레이 기록</b></div><span className="save-status"><i className={saveStatus === 'failed' ? 'failed' : ''}/>{saveStatus === 'saved' ? '이 브라우저에 자동 저장됨' : '저장 불가 · 기록을 내려받아 주세요'}</span></div>
        {notice && <div className="notice" role="status"><span>{notice}</span><button className="icon-button" aria-label="알림 닫기" onClick={() => setNotice('')}><X size={16}/></button></div>}
        <nav className="main-nav" aria-label="주 메뉴">{NAV.map(({id, label, icon: Icon}) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => selectTab(id)} aria-current={tab === id ? 'page' : undefined}><Icon size={17}/><span>{label}</span>{id === 'pokemon' && <small>{life.seen.length}</small>}{id === 'memories' && <small>{life.memories.length}</small>}</button>)}<span className="nav-life-id">LIFE № {String(life.seed).replace(/[^0-9a-z]/gi, '').slice(-6).toUpperCase() || '000001'}</span></nav>
        <div className="main-grid"><main>
          {tab === 'story' && <>
            <section className="chapter-header"><div><span className="eyebrow">CHAPTER {String(life.age < 6 ? 1 : life.age < 16 ? 2 : life.age < 30 ? 3 : life.age < 55 ? 4 : life.age < 70 ? 5 : 6).padStart(2, '0')}</span><h2>{stageOf(life.age)}<span>{life.age}세</span></h2><p>{life.ended ? '생애가 종료되었습니다.' : life.pending ? '결정 대기 중입니다.' : life.age < 6 ? '6세에 첫 파트너를 만납니다.' : `지금은 ${SEASONS[life.season]}. ${town.name}에서 활동 중입니다.`}</p></div><div className="chapter-stamp"><Sprout size={26}/><span>TRAINER LOG</span></div></section>
            <section className="playback" aria-label="인생 진행"><div className="playback-label"><span className={`live-dot ${running ? 'playing' : ''}`}/><span>{life.ended ? '생애 종료' : life.pending ? '선택을 기다리는 중' : running ? '자동 진행 중' : '일시 정지'}</span></div><div className="playback-actions"><div className="speed-options" aria-label="진행 배속">{[1,2,3,4,16].map(n=><button key={n} className={prefs.speed===n?'active':''} onClick={()=>setPref('speed',n)} aria-pressed={prefs.speed===n}>{n}×</button>)}</div><button className={`autoplay-button ${running ? 'active' : ''}`} onClick={() => { setTab('story'); setRunning(!running); }} disabled={life.ended || Boolean(life.pending && !prefs.autoDecisions)} aria-label={running ? '자동 진행 멈추기' : '자동 진행 시작'}>{running ? <Pause size={15}/> : <Play size={15}/>}<span>{running ? '멈추기' : '자동 진행'}</span></button>{life.ended&&<button className="primary-button" onClick={()=>openModal('ending')}>최종 기록</button>}</div></section>
            <div className="auto-choice-row"><label><input type="checkbox" checked={prefs.autoDecisions} onChange={e=>setPref('autoDecisions',e.target.checked)}/> 자동 결정</label><span>기록 1개 = {(3.6/prefs.speed).toFixed(2)}초 · 기록 4~7개마다 선택</span></div><LifeScene life={life} running={running&&!overlay}/><div className="journal-title"><span><Feather size={15}/> 사건 기록 <small>{life.log.length}개 사건</small></span><label><select aria-label="이야기 필터" value={filter} onChange={e => {setFilter(e.target.value); setShown(8);}}><option value="all">전체 사건</option><option value="special">주요 사건</option></select><ChevronDown size={12}/></label></div>
            <div className="timeline" aria-live="polite" aria-relevant="additions">{logs.slice(0, shown).map(entry => <StoryCard key={entry.id} entry={entry} life={life} onChoose={i => {setLife(s => choose(s, i));setRunning(true);}} onMemory={keep} onReplay={replayEvent}/>)}</div>
            {logs.length > shown && <button className="load-more" onClick={() => setShown(shown + 12)}>이전 기록 더 보기 <ChevronDown size={15}/></button>}
            {life.ended && <button className="ending-banner" onClick={() => openModal('ending')}><Sparkles size={25}/><span><b>한 사람의 삶, 한 권의 플레이 기록</b><small>배틀·탐험·선택 기록을 확인합니다.</small></span><ArrowUpRight size={22}/></button>}
          </>}
          {tab === 'pokemon' && <Dex life={life} onPokemon={setDetail}/>}
          {tab === 'map' && <LifeAtlas life={life}/>}
          {tab === 'memories' && <section className="collection-content"><div className="content-title"><div><span className="eyebrow">EVENT ARCHIVE</span><h2>주요 사건 기록</h2><p>저장한 사건과 선택 결과를 다시 확인합니다.</p></div><Bookmark size={24}/></div>{[...life.log].reverse().filter(e => life.memories.includes(e.id)).map(entry => <div className="memory-entry" key={entry.id}><span className="memory-age">{entry.age}살의 {SEASONS[entry.season]}</span><StoryCard entry={entry} life={life} onChoose={i => {setLife(s => choose(s, i));setRunning(true);}} onMemory={keep} onReplay={replayEvent} compact/></div>)}{life.memories.length === 0 && <div className="empty-state"><Bookmark/><h3>저장된 사건이 없습니다</h3><p>사건 기록에 있는 책갈피를 눌러 주세요.</p></div>}</section>}
        </main><LifeSidebar life={life} onPokemon={setDetail}/></div>
        <footer className="site-footer"><span><PokeBall/>POKÉLIFE / FAN-MADE SIMULATION</span><button onClick={() => openModal('about')}>게임 정보 <ArrowUpRight size={12}/></button><small>UNOFFICIAL FAN PROJECT · POKÉMON © NINTENDO / CREATURES / GAME FREAK</small></footer>
      </div>
    </div>

    {pendingEntry && decisionHidden && !activeEncounter && !modal && !detail && <div className="decision-dock" role="status"><span><b>선택 대기 중 · 진행 정지</b><small>{pendingEntry.title}</small></span><label className="dock-speed">선택 후 배속<select aria-label="선택창 숨김 중 진행 배속" value={prefs.speed} onChange={e=>setPref('speed',Number(e.target.value))}>{[1,2,3,4,16].map(n=><option key={n} value={n}>{n}×</option>)}</select></label><button className="primary-button" onClick={()=>setHiddenDecision(null)}>선택지 다시 열기 <ArrowRight size={16}/></button></div>}
    {modal==='birth'  && <Modal title="출생 배정 결과" className="birth-modal"><div className="birth-report"><PokeBall/><span className="eyebrow">A NEW POKÉMON LIFE</span><h2>{life.name}의 출생 기록</h2><p className="birth-location">{townOf(life).region}지방 · {townOf(life).name}</p><dl><dt>성별</dt><dd><select aria-label="플레이어 성별" value={life.gender} onChange={e=>setLife(s=>({...s,gender:e.target.value}))}>{Object.entries(GENDERS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></dd><dt>가족 구성</dt><dd>{life.family}</dd><dt>경제적 형편</dt><dd>{life.background.wealth}</dd><dt>주거 형태</dt><dd>{life.background.home}</dd><dt>주변 환경</dt><dd>{life.background.environment}</dd><dt>시작 소지금</dt><dd>{life.money.toLocaleString()} P</dd></dl><p>배정된 환경에서 삶이 자동으로 진행됩니다.<br/>사건이 생기면 선택지를 골라 주세요.</p><button className="primary-button wide" onClick={()=>{setModal(null);setRunning(true);}}>이 삶 시작하기 <ArrowRight size={16}/></button></div></Modal>}
    {pendingEntry && !decisionHidden && !activeEncounter && !modal && !detail && <Modal key={pendingEntry.id} title="행동 선택" onClose={hideDecision} className="decision-modal"><div className="decision-banner"><span>DECISION REQUIRED</span><b>{life.age}세 · {town.name}</b></div><div className="decision-body"><button className="secondary-button decision-hide" onClick={hideDecision}>잠깐 숨기고 화면 보기</button><span className="eyebrow">{pendingEntry.followup ? '후속 결정' : '새로운 사건'} · 선택 후 진행</span><h2>{pendingEntry.title}</h2><p>{formatBody(pendingEntry.body,life,pendingEntry)}</p><div className="decision-options">{pendingEntry.choices.map((c,i)=><button key={`${pendingEntry.id}-${i}`} disabled={(c.cost||0)>life.money||Boolean(c.join&&life.party.length>=6)} onClick={()=>{setLife(s=>choose(s,i));setRunning(true);}}><span className="decision-number">{String(i+1).padStart(2,'0')}</span><span><b>{c.label}</b><small>{c.join&&life.party.length>=6?'파티가 가득 찼습니다':(c.cost||0)>life.money?'소지금 부족':c.description}</small>{c.challenge ? <div className="chance-preview"><strong>성공 확률 {successChance(life,c)}% · {STAT_LABELS[c.challenge.stat]} {life.stats[c.challenge.stat]}</strong><small>성공: {c.outcome}</small><EffectChips effects={c.effects}/><small>실패: {c.challenge.failure.outcome}</small><EffectChips effects={c.challenge.failure.effects}/>{c.cost>0&&<small>성공 여부와 관계없이 {c.cost}P 사용</small>}</div> : <><small className="certain-result">{c.simulation?'배틀·포획 결과에 따라 달라집니다':'기본 활동 · 별도 성공 판정 없음'}</small><EffectChips effects={c.effects}/></>}</span><ArrowRight size={17}/></button>)}</div><div className="decision-foot">소지금 {life.money.toLocaleString()}P <span>선택 결과와 후속 사건이 기록됩니다.</span></div></div></Modal>}
    {activeEncounter && <Encounter data={activeEncounter} age={replay?.age ?? life.age} onClose={() => {if(replay)setReplay(null);else {setLife(acknowledge);setRunning(true);}}} sound={prefs.sound} toggleSound={soundToggle} replay={Boolean(replay)}/>}
    {modal === 'new' && !activeEncounter && <Modal title="새로운 삶 시작하기" onClose={() => setModal(null)}><form onSubmit={begin} className="new-life-form"><span className="modal-emblem"><Sprout size={28}/></span><span className="eyebrow">NEW GAME</span><h2>트레이너 생성</h2><p>이름을 입력하고 무작위로 배정된 환경에서 시작합니다.</p><label>당신의 이름<input autoComplete="off" maxLength={12} placeholder="하루" value={newName} onChange={e => setNewName(e.target.value)}/></label><label>플레이어 성별<select value={newGender} onChange={e=>setNewGender(e.target.value)}><option value="random">무작위</option>{Object.entries(GENDERS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><div className="birth-random-note">출신 지방 · 가족 구성 · 경제적 형편 · 주거 환경은 새 삶이 시작될 때 무작위로 배정됩니다.</div><details><summary>시드 설정</summary><label>게임 시드<input placeholder="비워두면 무작위 생성" maxLength={40} value={newSeed} onChange={e => setNewSeed(e.target.value)}/></label><small>같은 시드·출생지·선택 순서는 같은 진행을 재현합니다.</small></details>{life.age > 0 && <div className="replace-note"><p>현재 이야기를 새 삶으로 교체합니다. 간직하고 싶다면 먼저 내려받아 주세요.</p><button type="button" className="text-button" onClick={() => download(life)}><Download size={13}/> 현재 이야기 내려받기</button></div>}<button className="primary-button wide" type="submit">게임 시작 <ArrowRight size={17}/></button></form></Modal>}
    {modal === 'settings' && !activeEncounter && <Modal title="게임 설정" onClose={() => setModal(null)}><div className="settings-content"><span className="eyebrow">GAME SETTINGS</span><h2>게임 설정</h2><p>플레이어 정보·자동 진행·저장 데이터를 관리합니다.</p><div className="setting-row"><span><b>플레이어 성별</b><small>능력치나 진로에는 영향을 주지 않습니다.</small></span><select aria-label="플레이어 성별 변경" value={life.gender} onChange={e=>setLife(s=>({...s,gender:e.target.value}))}>{Object.entries(GENDERS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></div><div className="setting-row"><span><b>만남의 소리</b><small>특별한 만남에 짧은 음악이 흐릅니다.</small></span><button className={`toggle ${prefs.sound ? 'on' : ''}`} onClick={soundToggle} role="switch" aria-checked={prefs.sound} aria-label="만남의 소리"><i/></button></div><div className="setting-row"><span><b>자동 결정</b><small>자동 진행 중 갈림길을 무작위로 선택합니다.</small></span><button className={`toggle ${prefs.autoDecisions ? 'on' : ''}`} onClick={() => setPref('autoDecisions', !prefs.autoDecisions)} role="switch" aria-checked={prefs.autoDecisions} aria-label="자동 선택"><i/></button></div><div className="setting-row"><span><b>자동 진행 속도</b><small>특별한 만남에서는 언제나 잠시 멈춥니다.</small></span><select aria-label="자동 진행 속도" value={prefs.speed} onChange={e => setPref('speed', Number(e.target.value))}>{[1,2,3,4,16].map(n => <option key={n} value={n}>{n}×</option>)}</select></div><div className="settings-storage"><h3>저장 데이터 관리</h3><p>진행 상황은 이 브라우저에 저장됩니다. 다른 기기로 옮기거나 브라우저 데이터를 지우기 전에는 기록을 내려받아 주세요.</p><button className="secondary-button" onClick={() => download(life)}><Download size={15}/> 기록 내려받기</button><button className="secondary-button" onClick={() => fileRef.current?.click()}><BookOpen size={15}/> 기록 불러오기</button><input hidden ref={fileRef} type="file" accept="application/json,.json" onChange={importStory}/>{notice && <p className="form-notice" role="status">{notice}</p>}</div></div></Modal>}
    {detail && !activeEncounter && <Modal title={`${POKEMON[detail]?.name} 도감`} onClose={() => setDetail(null)}><div className="pokemon-detail"><span className="eyebrow">POKÉDEX ENTRY</span><img src={artwork(detail)} alt={POKEMON[detail]?.name}/><span className="dex-number">No. {String(detail).padStart(4,'0')}</span><h2>{POKEMON[detail]?.name}</h2><span className="type-label">{POKEMON[detail]?.genus} · {POKEMON[detail]?.types.join(' / ')}</span><p>{POKEMON[detail]?.description || '한국어 도감 설명이 없습니다.'}</p>{life.party.some(p => p.id === detail) && <div className="detail-bond"><Heart size={15}/> 현재 파티에 편성되어 있습니다.</div>}</div></Modal>}
    {modal === 'ending' && !activeEncounter && <Modal title="인생 회고" onClose={() => setModal(null)} className="ending-modal"><div className="ending-content"><span className="eyebrow">FINAL RESULTS</span><Sprout className="ending-sprout" size={42}/><h2>{life.name}의<br/>최종 기록</h2><p>{TOWNS.find(t => t.id === life.hometown).name} 출생 · {life.age}세에 생애를 마쳤습니다.</p><div className="ending-stats"><span><b>{life.visited.length}</b>머문 마을</span><span><b>{life.seen.length}</b>만난 포켓몬</span><span><b>{life.memories.length}</b>간직한 순간</span></div><div className="ending-party">{life.party.map((p,i) => <img key={i} src={sprite(p.id,p.shiny)} className="pixel" alt={POKEMON[p.id].name}/>)}</div><p>배틀 승리 {life.game.wins}회 · 포획 {life.game.catches}회 · 완료 선택 {life.log.filter(e=>e.resolution).length}개</p><button className="primary-button wide" onClick={() => download(life, true)}><Download size={16}/> 전체 기록 내려받기</button><button className="text-button" onClick={() => setModal('new')}><RotateCcw size={14}/> 새 게임 시작</button></div></Modal>}
    {modal === 'about' && !activeEncounter && <Modal title="게임 정보" onClose={() => setModal(null)}><div className="about-content"><span className="eyebrow">GAME INFORMATION</span><h2>Pokélife 게임 정보</h2><p>Pokélife는 포켓몬 세계에서 한 사람의 평생을 지켜보는 비공식 팬 시뮬레이션입니다. 일상 기록이 자동으로 쌓이고 기록 4~7개 사이에 선택창이 나타납니다. 진학·진로 사건은 정해진 나이에 등장합니다.</p><p>9개 지방·40개 마을, 4개 진로, 32개 장기 활동 경로와 27개 지방 사건 경로를 플레이할 수 있습니다. 사건은 이전 선택과 현재 지방에 따라 달라집니다. 수명은 개인별로 다르며 건강도 영향을 줍니다.</p><p>공식 지명과 캐릭터를 바탕으로 하되 인생 사건, 대사, 확률, 인간관계는 이 작품을 위해 창작했습니다. 타입 상성은 원작 자료를 사용합니다. 배틀 수치·장비 해금·체육관 구성은 이 게임의 간소화된 규칙입니다.</p><h3>이 세계를 만드는 데 도움을 준 자료</h3><p><a href="https://github.com/PokeAPI/pokeapi" target="_blank" rel="noreferrer">PokéAPI 데이터</a> · <a href="https://github.com/PokeAPI/sprites" target="_blank" rel="noreferrer">PokéAPI / 커뮤니티 스프라이트</a> · <a href="https://github.com/pret" target="_blank" rel="noreferrer">pret 지도·인물 자료</a></p><p className="content-note">Pokémon 및 관련 이미지·명칭의 권리는 각 권리자에게 있습니다. Nintendo, Creatures, GAME FREAK와 제휴하지 않았습니다. 최신 세대 일부 도트는 커뮤니티 제작 자료입니다.</p><p className="content-note">운영체제의 ‘동작 줄이기’ 설정을 존중합니다. 소리는 기본적으로 꺼져 있습니다.</p></div></Modal>}
  </>;
}
