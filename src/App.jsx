import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, BarChart3, Bookmark, BookOpen, ChevronDown, ChevronRight, Feather, Map, Pause, Play, Plus, Settings2, Sparkles, Sprout, Trophy, Volume2, VolumeX, X } from 'lucide-react';
import { SEASONS } from './data/world.js';
import { SAVE_KEY, createLife, advance, choose, acknowledge, toggleMemory, autoChoice, parseSave, townOf, stageOf, setPartyMode, togglePin, movePokemon, setLead, setGoal, renamePokemon } from './engine.js';
import { SimulationReport } from './ui/Report.jsx';
import { LEGACY_KEY, parseLegacy, recordLife, chooseHeir, unlockedPerks } from './sim/legacy.js';
import { TrainerHud } from './ui/Hud.jsx';
import { PartyManager } from './ui/PartyManager.jsx';
import { LegacyHall } from './ui/Legacy.jsx';
import { PokeBall } from './ui/common.jsx';
import { Encounter, playChime } from './ui/Encounter.jsx';
import { StoryCard } from './ui/StoryCard.jsx';
import { Dex } from './ui/Dex.jsx';
import { LifeScene, LifeSidebar, LifeAtlas } from './ui/LifeView.jsx';
import { BirthModal, DecisionModal, NewLifeModal, SettingsModal, PokemonModal, EndingModal, AboutModal } from './ui/modals.jsx';
import { formatText } from './ui/format.js';

const OPTIONS_KEY = 'pokelife.preferences.v1';
const SPEEDS = [1, 2, 3, 4, 16];
const NAV = [{ id: 'story', label: '게임 화면', icon: BookOpen }, { id: 'pokemon', label: '포켓몬 도감', icon: PokeBall }, { id: 'memories', label: '주요 기록', icon: Bookmark }, { id: 'map', label: '여행 기록', icon: Map }, { id: 'report', label: '시뮬레이션 리포트', icon: BarChart3 }, { id: 'legacy', label: '가문의 전당', icon: Trophy }];
const MAJOR_KINDS = ['milestone', 'choice', 'ending', 'echo'];

function initial() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const saved = raw && parseSave(raw);
    if (raw && !saved) {
      localStorage.setItem(`${SAVE_KEY}.recovery`, raw);
      return { life: createLife(), notice: '저장된 기록을 읽지 못해 새 이야기를 열었습니다. 기존 기록은 복구용으로 보관했습니다.' };
    }
    return { life: saved || createLife(), notice: '' };
  } catch {
    return { life: createLife(), notice: '이 브라우저에서는 자동 저장을 사용할 수 없습니다. 저장 파일을 내려받아 보관하세요.' };
  }
}

// The legacy (finished lives, cumulative dex, medals, the egg for the next generation) lives in its own key.
function loadLegacy() {
  try { return parseLegacy(localStorage.getItem(LEGACY_KEY) || ''); } catch { return parseLegacy(''); }
}

function loadOptions() {
  try {
    const s = JSON.parse(localStorage.getItem(OPTIONS_KEY) || '{}');
    return { sound: s.sound === true, speed: SPEEDS.includes(s.speed) ? s.speed : 1, autoDecisions: s.autoDecisions === true };
  } catch {
    return { sound: false, speed: 1, autoDecisions: false };
  }
}

function download(life, asText = false) {
  const body = asText
    ? `${life.name}의 플레이 기록\n${townOf(life).region} · ${life.age}세\n\n${life.log.map(e => `${e.age}세 — ${formatText(e.title, life, e)}\n${formatText(e.body, life, e)}${e.resolution ? `\n선택: ${formatText(e.resolution.label, life, e)}${e.resolution.check ? ` (${e.resolution.check.success ? '성공' : '실패'}, 성공률 ${e.resolution.check.chance}%)` : ''}\n${formatText(e.resolution.text, life, e)}` : ''}`).join('\n\n')}`
    : JSON.stringify(life, null, 2);
  const url = URL.createObjectURL(new Blob([body], { type: asText ? 'text/plain;charset=utf-8' : 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = `pokelife-${life.name}-${life.age}.${asText ? 'txt' : 'json'}`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function rememberPrevious(life) {
  try { localStorage.setItem(`${SAVE_KEY}.previous`, JSON.stringify(life)); } catch { /* manual export remains available */ }
}

const chapterOf = age => age < 6 ? 1 : age < 16 ? 2 : age < 30 ? 3 : age < 55 ? 4 : age < 70 ? 5 : 6;

export default function App() {
  const [boot] = useState(initial);
  const [life, setLife] = useState(boot.life);
  const [notice, setNotice] = useState(boot.notice);
  const [prefs, setPrefs] = useState(loadOptions);
  const [running, setRunning] = useState(true);
  const [tab, setTab] = useState('story');
  const [modal, setModal] = useState(boot.life.log.length === 1 ? 'birth' : null);
  const [replay, setReplay] = useState(null);
  const [detail, setDetail] = useState(null);
  const [filter, setFilter] = useState('all');
  const [shown, setShown] = useState(8);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [form, setForm] = useState({ name: '', seed: '', gender: 'random', goal: 'free', useHeir: true, perks: [], rules: [], town: 'random', starter: '' });
  const [legacy, setLegacy] = useState(loadLegacy);
  const [hiddenDecision, setHiddenDecision] = useState(null);
  const fileRef = useRef(null);

  const decisionHidden = Boolean(life.pending && hiddenDecision === life.pending);
  const activeEncounter = replay || life.encounter;
  const overlay = activeEncounter || modal || detail || (life.pending && !decisionHidden);
  const autoBlocked = activeEncounter || modal || detail || decisionHidden;
  const pendingEntry = life.log.find(e => e.id === life.pending);
  const town = townOf(life);

  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(life)); setSaveStatus('saved'); } catch { setSaveStatus('failed'); }
  }, [life]);
  useEffect(() => { try { localStorage.setItem(OPTIONS_KEY, JSON.stringify(prefs)); } catch { /* noncritical preferences */ } }, [prefs]);
  // A finished life is added to the legacy once (recordLife ignores a life it already has).
  useEffect(() => { if (life.ended) setLegacy(l => recordLife(l, life)); }, [life]);
  useEffect(() => { try { localStorage.setItem(LEGACY_KEY, JSON.stringify(legacy)); } catch { /* the hall is a convenience */ } }, [legacy]);
  useEffect(() => {
    if (!running || autoBlocked || life.ended || (life.pending && !prefs.autoDecisions) || document.hidden) return;
    const timer = setTimeout(() => setLife(s => s.pending ? autoChoice(s) : advance(s)), 3600 / prefs.speed);
    return () => clearTimeout(timer);
  }, [running, autoBlocked, life.log.length, life.age, life.season, life.pending, life.ended, prefs.speed, prefs.autoDecisions]);
  useEffect(() => {
    const pause = () => { if (document.hidden) setRunning(false); };
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, []);
  useEffect(() => { if (life.ended) setRunning(false); }, [life.ended]);

  const setPref = (key, value) => setPrefs(p => ({ ...p, [key]: value }));
  const toggleSound = () => { if (!prefs.sound) playChime(); setPref('sound', !prefs.sound); };
  const setGender = gender => setLife(s => ({ ...s, gender }));
  const changeGoal = goal => setLife(s => setGoal(s, goal));
  const party = { onMode: mode => setLife(s => setPartyMode(s, mode)), onPin: uid => setLife(s => togglePin(s, uid)),
    onMove: (uid, swap) => setLife(s => movePokemon(s, uid, swap)), onLead: uid => setLife(s => setLead(s, uid)) };
  const keep = id => setLife(s => toggleMemory(s, id));
  const decide = i => { setLife(s => choose(s, i)); setRunning(true); };
  const hideDecision = () => { setHiddenDecision(life.pending); setRunning(false); };
  const replayEvent = (data, age) => { setRunning(false); setReplay({ ...data, age }); };
  const openModal = key => { setRunning(false); setModal(key); };
  const selectTab = id => { setTab(id); setShown(8); if (id !== 'story') setRunning(false); };

  function begin(e) {
    e.preventDefault();
    rememberPrevious(life);
    const heritage = form.useHeir && legacy.heir ? legacy.heir : null;
    // Perks are only offered once unlocked (see NewLifeModal); town and starter choices need their perk.
    const perks = form.perks.filter(id => unlockedPerks(legacy).includes(id));
    setLife(createLife({ name: form.name || '하루', gender: form.gender, seed: form.seed || crypto.randomUUID(), goal: form.goal, heritage, perks, rules: form.rules,
      town: perks.includes('town-pass') ? form.town : 'random', starter: perks.includes('starter-pick') && !heritage && form.starter ? Number(form.starter) : null }));
    if (heritage) setLegacy(l => ({ ...l, heir: null }));
    setHiddenDecision(null); setModal('birth'); setReplay(null); setTab('story'); setShown(8); setFilter('all'); setRunning(true); setNotice('');
  }

  async function importStory(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 3_000_000) throw new Error('기록 파일이 너무 큽니다. 3MB 이하의 Pokélife 기록을 선택해 주세요.');
      const saved = parseSave(await file.text());
      if (!saved) throw new Error('호환되는 Pokélife 기록이 아닙니다. 현재 이야기는 그대로 유지됩니다.');
      rememberPrevious(life);
      setLife(saved); setHiddenDecision(null); setModal(null); setTab('story'); setRunning(false); setNotice('저장 데이터를 불러왔습니다.');
    } catch (error) { setNotice(error.message || '기록을 불러오지 못했습니다.'); }
    event.target.value = '';
  }

  const logs = [...life.log].reverse().filter(e => filter === 'all' || e.encounter || MAJOR_KINDS.includes(e.kind));
  const status = life.ended ? '생애 종료' : life.pending ? '선택을 기다리는 중' : running ? '자동 진행 중' : '일시 정지';

  return <>
    <div className="app-shell" inert={Boolean(overlay)}>
      <header className="site-header">
        <a href="#" className="brand" onClick={e => { e.preventDefault(); selectTab('story'); }} aria-label="Pokélife 나의 플레이 기록">
          <span className="brand-icon"><PokeBall/></span><span>pokélife<span className="brand-dot">.</span></span><small>POKÉMON LIFE SIMULATOR</small>
        </a>
        <div className="header-right">
          <span className="edition-label">YOUR POKÉMON LIFE</span>
          <button className="icon-button" onClick={toggleSound} aria-label={prefs.sound ? '소리 끄기' : '소리 켜기'}>{prefs.sound ? <Volume2 size={18}/> : <VolumeX size={18}/>}</button>
          <button className="icon-button" onClick={() => openModal('settings')} aria-label="설정"><Settings2 size={18}/></button>
          <button className="new-life-button" onClick={() => openModal('new')}><Plus size={15}/><span>새로운 삶</span></button>
        </div>
      </header>
      <div className="page-container">
        <div className="page-top">
          <div className="breadcrumb"><span>트레이너 시스템</span><ChevronRight size={13}/><b>{life.name}의 플레이 기록</b></div>
          <span className="save-status"><i className={saveStatus === 'failed' ? 'failed' : ''}/>{saveStatus === 'saved' ? '이 브라우저에 자동 저장됨' : '저장 불가 · 기록을 내려받아 주세요'}</span>
        </div>
        {notice && <div className="notice" role="status"><span>{notice}</span><button className="icon-button" aria-label="알림 닫기" onClick={() => setNotice('')}><X size={16}/></button></div>}
        <nav className="main-nav" aria-label="주 메뉴">
          {NAV.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => selectTab(id)} aria-current={tab === id ? 'page' : undefined}>
            <Icon size={17}/><span>{label}</span>{id === 'pokemon' && <small>{life.seen.length}</small>}{id === 'memories' && <small>{life.memories.length}</small>}
          </button>)}
          <span className="nav-life-id">LIFE № {String(life.seed).replace(/[^0-9a-z]/gi, '').slice(-6).toUpperCase() || '000001'}</span>
        </nav>
        <div className="main-grid"><LifeSidebar life={life} onPokemon={setDetail} side="trainer"/><main>
          <TrainerHud life={life} onParty={() => openModal('party')} onGoal={changeGoal}/>
          {tab === 'story' && <>
            <section className="chapter-header">
              <div><span className="eyebrow">CHAPTER {String(chapterOf(life.age)).padStart(2, '0')}</span><h2>{stageOf(life.age)}<span>{life.age}세</span></h2>
                <p>{life.ended ? '생애가 종료되었습니다.' : life.pending ? '결정 대기 중입니다.' : life.age < 6 ? '6세에 첫 파트너를 만납니다.' : `지금은 ${SEASONS[life.season]}. ${town.name}에서 활동 중입니다.`}</p></div>
              <div className="chapter-stamp"><Sprout size={26}/><span>TRAINER LOG</span></div>
            </section>
            <section className="playback" aria-label="인생 진행">
              <div className="playback-label"><span className={`live-dot ${running ? 'playing' : ''}`}/><span>{status}</span></div>
              <div className="playback-actions">
                <div className="speed-options" aria-label="진행 배속">{SPEEDS.map(n => <button key={n} className={prefs.speed === n ? 'active' : ''} onClick={() => setPref('speed', n)} aria-pressed={prefs.speed === n}>{n}×</button>)}</div>
                <button className={`autoplay-button ${running ? 'active' : ''}`} onClick={() => { setTab('story'); setRunning(!running); }} disabled={life.ended || Boolean(life.pending && !prefs.autoDecisions)} aria-label={running ? '자동 진행 멈추기' : '자동 진행 시작'}>
                  {running ? <Pause size={15}/> : <Play size={15}/>}<span>{running ? '멈추기' : '자동 진행'}</span></button>
                {life.ended && <button className="primary-button" onClick={() => openModal('ending')}>최종 기록</button>}
              </div>
            </section>
            <div className="auto-choice-row"><label><input type="checkbox" checked={prefs.autoDecisions} onChange={e => setPref('autoDecisions', e.target.checked)}/> 자동 결정 (캐릭터가 스스로 선택)</label><span>기록 1개 = {(3.6 / prefs.speed).toFixed(2)}초 · 기록 4~7개마다 선택</span></div>
            <LifeScene life={life} running={running && !overlay}/>
            <div className="journal-title"><span><Feather size={15}/> 사건 기록 <small>{life.log.length}개 사건</small></span>
              <label><select aria-label="이야기 필터" value={filter} onChange={e => { setFilter(e.target.value); setShown(8); }}><option value="all">전체 사건</option><option value="special">주요 사건</option></select><ChevronDown size={12}/></label></div>
            <div className="timeline" aria-live="polite" aria-relevant="additions">{logs.slice(0, shown).map(entry => <StoryCard key={entry.id} entry={entry} life={life} onMemory={keep} onReplay={replayEvent}/>)}</div>
            {logs.length > shown && <button className="load-more" onClick={() => setShown(shown + 12)}>이전 기록 더 보기 <ChevronDown size={15}/></button>}
            {life.ended && <button className="ending-banner" onClick={() => openModal('ending')}><Sparkles size={25}/><span><b>한 사람의 삶, 한 권의 플레이 기록</b><small>배틀·탐험·선택 기록을 확인합니다.</small></span><ArrowUpRight size={22}/></button>}
          </>}
          {tab === 'pokemon' && <Dex life={life} onPokemon={setDetail}/>}
          {tab === 'map' && <LifeAtlas life={life}/>}
          {tab === 'report' && <SimulationReport life={life} onRename={(uid, name) => setLife(s => renamePokemon(s, uid, name))}/>}
          {tab === 'legacy' && <LegacyHall legacy={legacy} life={life}/>}
          {tab === 'memories' && <section className="collection-content">
            <div className="content-title"><div><span className="eyebrow">EVENT ARCHIVE</span><h2>주요 사건 기록</h2><p>저장한 사건과 선택 결과를 다시 확인합니다.</p></div><Bookmark size={24}/></div>
            {[...life.log].reverse().filter(e => life.memories.includes(e.id)).map(entry => <div className="memory-entry" key={entry.id}>
              <span className="memory-age">{entry.age}살의 {SEASONS[entry.season]}</span><StoryCard entry={entry} life={life} onMemory={keep} onReplay={replayEvent} compact/></div>)}
            {life.memories.length === 0 && <div className="empty-state"><Bookmark/><h3>저장된 사건이 없습니다</h3><p>사건 기록에 있는 책갈피를 눌러 주세요.</p></div>}
          </section>}
        </main><LifeSidebar life={life} onPokemon={setDetail} side="world"/></div>
        <footer className="site-footer"><span><PokeBall/>POKÉLIFE / FAN-MADE SIMULATION</span><button onClick={() => openModal('about')}>게임 정보 <ArrowUpRight size={12}/></button><small>UNOFFICIAL FAN PROJECT · POKÉMON © NINTENDO / CREATURES / GAME FREAK</small></footer>
      </div>
    </div>

    {pendingEntry && decisionHidden && !activeEncounter && !modal && !detail && <div className="decision-dock" role="status">
      <span><b>선택 대기 중 · 진행 정지</b><small>{formatText(pendingEntry.title, life, pendingEntry)}</small></span>
      <label className="dock-speed">선택 후 배속<select aria-label="선택창 숨김 중 진행 배속" value={prefs.speed} onChange={e => setPref('speed', Number(e.target.value))}>{SPEEDS.map(n => <option key={n} value={n}>{n}×</option>)}</select></label>
      <button className="primary-button" onClick={() => setHiddenDecision(null)}>선택지 다시 열기 <ArrowRight size={16}/></button>
    </div>}
    {modal === 'birth' && <BirthModal life={life} onGender={setGender} onGoal={changeGoal} onStart={() => { setModal(null); setRunning(true); }}/>}
    {modal === 'party' && !activeEncounter && <PartyManager life={life} {...party} onClose={() => setModal(null)}/>}
    {pendingEntry && !decisionHidden && !activeEncounter && !modal && !detail && <DecisionModal life={life} entry={pendingEntry} onChoose={decide} onHide={hideDecision}/>}
    {activeEncounter && <Encounter data={activeEncounter} age={replay?.age ?? life.age} sound={prefs.sound} toggleSound={toggleSound} replay={Boolean(replay)} decisionNext={!replay && Boolean(life.pending)}
      onClose={() => { if (replay) setReplay(null); else { setLife(acknowledge); setRunning(true); } }}/>}
    {modal === 'new' && !activeEncounter && <NewLifeModal life={life} legacy={legacy} form={form} setForm={setForm} onSubmit={begin} onClose={() => setModal(null)} onDownload={() => download(life)}/>}
    {modal === 'settings' && !activeEncounter && <SettingsModal life={life} prefs={prefs} notice={notice} onGender={setGender} onSound={toggleSound} setPref={setPref}
      onDownload={() => download(life)} onImport={importStory} fileRef={fileRef} onClose={() => setModal(null)}/>}
    {detail && !activeEncounter && <PokemonModal life={life} id={detail} onClose={() => setDetail(null)}/>}
    {modal === 'ending' && !activeEncounter && <EndingModal life={life} legacy={legacy} onChooseHeir={life.ended ? uid => setLegacy(l => chooseHeir(l, life, uid)) : null} onDownload={() => download(life, true)} onNew={() => setModal('new')} onClose={() => setModal(null)}/>}
    {modal === 'about' && !activeEncounter && <AboutModal onClose={() => setModal(null)}/>}
  </>;
}
