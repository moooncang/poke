import { createTalent } from './sim/talent.js';
// Public simulation API used by the UI and tests. A life is a plain JSON object; every function returns a new state.
//
// One call to `advance` adds exactly one journal entry. Each year has one main event (usually a decision); a decision
// is shown only after 4–7 automatic records (news, people, party changes, echoes of earlier choices, daily life).
import { activityRecord, vignetteRecord } from './data/activity-records.js';
import { BACKGROUNDS, ENVIRONMENTS } from './data/life-events.js';
import { resolveRelationship } from './data/relationships.js';
import { milestoneEvent, EDUCATION_GROWTH } from './data/milestones.js';
import { annualTraining } from './data/progression.js';
import { successChance } from './data/challenges.js';
import { TOWNS, CAREERS, NPCS, TRAITS } from './data/world.js';
import { REGIONS } from './data/regions.js';
import { hashSeed, random, pick, chance, between, clamp, weighted } from './sim/random.js';
import { STAT_LABELS, GENDERS } from './sim/labels.js';
import { createWorld, tickWorld, shiftRegion, currentRegion, economyFactor, regionState } from './sim/world.js';
import { createCast, tickPeople, changeCast } from './sim/people.js';
import { addPokemon, reorganize, evolveMembers, growParty, trainParty, partnerOf, PARTY_LIMIT } from './sim/party.js';
import { goalFit } from './sim/goals.js';
import { recordYear } from './sim/history.js';
import { runContest } from './sim/contest.js';
import { hasPerk, hasRule, cleanPerks, cleanRules, RULE_FRAIL_LIFESPAN, WANDER_EVERY } from './sim/perks.js';
import { tickStanding, takeLoan, inPrison, LOAN_LIMIT } from './sim/standing.js';
import { diff, DIFFICULTIES } from './sim/difficulty.js';
import { LEGENDARY } from './data/species-rules.js';
import { validHeritage } from './sim/legacy.js';
import { autoBattle, battleSummary, freshGear, MEGA, GMAX, ALL_TYPES } from './sim/battle.js';
import { plantSeeds, resolveEchoes, takeDueChoice } from './sim/consequences.js';
import { directEvent } from './sim/director.js';
import { poke, josa } from './sim/text.js';
import { GOALS as GOAL_TABLE } from './sim/goals.js';
const GOALS_LIST = Object.keys(GOAL_TABLE);

export { STAT_LABELS, GENDERS, successChance, partnerOf, PARTY_LIMIT, hashSeed };
export { setPartyMode, togglePin, movePokemon, setLead, renamePokemon, PARTY_MODES } from './sim/party.js';
export { setGoal, GOALS } from './sim/goals.js';
import { SAVE_VERSION } from './sim/save.js';
export { parseSave } from './sim/save.js';

export const SAVE_KEY = 'pokelife.story.v1';
export const VERSION = SAVE_VERSION;
export const townOf = state => TOWNS.find(t => t.id === state.town);
export const stageOf = age => age < 6 ? '유년기' : age < 16 ? '초보 트레이너' : age < 30 ? '성인기' : age < 55 ? '전성기' : age < 70 ? '중년기' : '노년기';

const TRAIT_DISPOSITION = { '신중한 관찰자': 'curious', '탐구형 트레이너': 'curious', '겁 없는 모험가': 'bold', '느긋한 낙천가': 'easygoing', '계획형 트레이너': 'pragmatic' };
const MEMORABLE = ['encounter', 'milestone', 'choice', 'ending'];
/** Share of filler records that become an event the character decides alone. */
export const AUTO_SHARE = 0.3;

// ── Bookkeeping ──
// Gains shrink near the top of a scale, so stats settle in a band where checks still matter (see yearlyDrift).
export const diminished = (current, value) => value <= 0 ? value : current >= 85 ? Math.ceil(value / 3) : current >= 70 ? Math.ceil(value / 2) : value;
function apply(state, effects = {}) {
  for (const [key, value] of Object.entries(effects)) {
    if (key === 'money') state.money = Math.max(0, state.money + value);
    else if (key === 'reputation') state.reputation = clamp(state.reputation + diminished(state.reputation, value), 0, 100);
    else if (key === 'infamy') state.infamy = clamp((state.infamy || 0) + value, 0, 100);
    else if (key === 'debt') state.debt = Math.max(0, (state.debt || 0) + value);
    else if (key in state.stats) state.stats[key] = clamp(state.stats[key] + diminished(state.stats[key], value), 0, 100);
  }
}

function queue(state, records) {
  for (const record of records.filter(Boolean)) state.queue.push({ ...record, queuedAt: state.age });
  // Keep the backlog short; stale news goes first, consequences and party changes are never dropped.
  while (state.queue.length > 10) {
    const index = state.queue.findIndex(r => r.kind === 'news' || r.kind === 'people');
    state.queue.splice(index < 0 ? 0 : index, 1);
  }
}

// Player decisions only: events the character settled on their own (entry.auto) do not reset the spacing.
const isDecision = e => e.choices && !e.auto;
function recordsSinceDecision(state) {
  const index = state.log.findLastIndex(isDecision);
  return index < 0 ? state.log.length : state.log.length - index - 1;
}
const recordGap = state => 4 + hashSeed(`${state.seed}-gap-${state.log.filter(isDecision).length}`) % 4;

function nextFiller(state) {
  if (state.activity?.step === 0) return activityRecord(state, townOf(state));
  while (state.queue.length) {
    const record = state.queue.shift();
    if (record.kind !== 'news' || state.age - record.queuedAt <= 1) { delete record.queuedAt; return record; }
  }
  // Between the player's decisions the character also settles smaller matters alone (see AUTO_CATEGORIES).
  if (state.age >= 6 && chance(state, AUTO_SHARE)) {
    const event = directEvent(state, { auto: true });
    if (event) return { ...event, auto: true, kind: 'auto' };
  }
  return (chance(state, 0.35) && vignetteRecord(state, townOf(state), () => random(state))) || activityRecord(state, townOf(state));
}

function encounterEffects(state, data) {
  if (data.pokemonId && !state.seen.includes(data.pokemonId)) state.seen.push(data.pokemonId);
  if (data.npc && !state.people.some(p => p.id === data.npc)) state.people.push({ id: data.npc, age: state.age });
  if (data.join) {
    const origin = data.type === 'partner' ? 'partner' : 'wild';
    queue(state, [addPokemon(state, data.pokemonId, { shiny: data.type === 'shiny' || Boolean(data.shiny), origin, affection: origin === 'partner' ? 60 : 40 }).record]);
  }
}

function log(state, event) {
  if (event.choices && !event.auto && recordsSinceDecision(state) < recordGap(state)) {
    state.scheduledEvent = event;
    return log(state, nextFiller(state));
  }
  if (event.encounter) encounterEffects(state, event.encounter);
  // Never strand the player: if nothing is affordable right now, offer a free way out.
  if (event.choices && event.choices.every(c => (c.cost || 0) > state.money)) {
    event = { ...event, choices: [...event.choices, { label: '지금은 형편이 안 된다', description: '소지금 부족 · 이번에는 넘긴다', tone: 'pragmatic', effects: { joy: -1 }, outcome: '형편이 되지 않아 이번에는 넘겼다.' }] };
  }
  const entry = { age: state.age, season: state.season ?? 0, town: state.town, partnerId: partnerOf(state)?.id || null, kind: 'life', effects: {},
    ...event, sourceId: event.sourceId ?? event.id ?? null, id: `${state.seed}-${state.age}-${state.log.length}` };
  state.log.push(entry);
  apply(state, entry.effects);
  if (entry.encounter) state.encounter = { ...entry.encounter, logId: entry.id };
  if (entry.memory || MEMORABLE.includes(entry.kind)) state.memories.push(entry.id);
  if (entry.choices && entry.auto) {
    const index = pickChoice(state, entry);
    if (index >= 0) resolveChoice(state, entry, index, { auto: true });
  } else if (entry.choices) state.pending = entry.id;
  return state;
}

// ── Life creation ──
/**
 * `heritage` (optional) comes from the previous generation (sim/legacy.js heritageFor): the egg that hatches into
 * the first partner at 6, plus a small inheritance. An invalid heritage is ignored.
 */
export function createLife({ name = '하루', seed = String(Date.now()), town = 'random', gender = 'random', goal = 'free', heritage = null, perks = [], rules = [], starter = null, difficulty = 'normal' } = {}) {
  const state = { version: VERSION, name: name.trim().slice(0, 12) || '하루', seed: String(seed).slice(0, 40), rng: hashSeed(seed), age: 0, season: 0,
    town: '', hometown: '', family: '', trait: '', career: null, careerRank: 0, education: null, money: 1800, reputation: 5,
    stats: { joy: 72, vitality: 85, courage: 32, wisdom: 18, bond: 0 },
    disposition: { bold: 0, curious: 0, caring: 0, pragmatic: 0, easygoing: 0 },
    work: { years: 0, satisfaction: 60, cut: 0, retired: false },
    party: [], box: [], nextUid: 0, people: [], seen: [], log: [], memories: [], used: [], cooldowns: {}, flags: {},
    seeds: [], queue: [], pending: null, encounter: null, ended: false, visited: [], lifespan: 0, game: freshGear() };
  state.talent = createTalent(state.seed);
  state.goal = goal;
  state.partyPlan = { mode: 'auto', pinned: [] };
  state.heritage = validHeritage(heritage) ? structuredClone(heritage) : null;
  state.perks = cleanPerks(perks);
  state.rules = cleanRules(rules);
  // A chosen first partner (perk "파트너 선택권"); an inherited egg takes precedence.
  state.starter = Number.isInteger(starter) && starter >= 1 && starter <= 1025 && !LEGENDARY.has(starter) && !state.heritage ? starter : null;
  state.history = [];
  state.infamy = 0; state.debt = 0; state.prison = 0;
  state.difficulty = Object.hasOwn(DIFFICULTIES, difficulty) ? difficulty : 'normal';
  state.gender = Object.hasOwn(GENDERS, gender) ? gender : hashSeed(`${seed}-gender`) % 2 ? 'female' : 'male';
  state.town = TOWNS.some(t => t.id === town) ? town : pick(state, TOWNS).id;
  state.lifespan = 64 + Math.floor(random(state) * 37);
  const background = pick(state, BACKGROUNDS);
  state.background = { ...background, environment: pick(state, ENVIRONMENTS) };
  state.money = Math.round(background.money * diff(state, 'money')); state.stats.wisdom += background.wisdom; state.stats.bond += background.bond;
  state.relationship = { name: pick(state, ['유진', '서윤', '지호', '도윤']), status: 'single', chapter: 0, trust: 20, children: 0 };
  state.hometown = state.town;
  state.visited.push(state.town);
  state.family = background.family;
  state.trait = pick(state, TRAITS);
  state.disposition[TRAIT_DISPOSITION[state.trait]] = 3;
  state.world = createWorld(state);
  state.cast = createCast(state);
  if (!GOALS_LIST.includes(state.goal)) state.goal = 'free';
  const h = state.heritage;
  if (h && !hasRule(state, 'poor')) state.money += h.inheritance;
  if (hasRule(state, 'poor')) state.money = 0;
  if (hasRule(state, 'frail')) state.lifespan = Math.min(state.lifespan, RULE_FRAIL_LIFESPAN);
  if (hasPerk(state, 'long-line')) state.lifespan += 4;
  state.lifespan = clamp(state.lifespan + diff(state, 'lifespan'), 60, 105);
  if (hasPerk(state, 'renowned')) state.reputation += 10;
  if (hasPerk(state, 'ball-case')) state.game.balls += 12;
  log(state, { title: '출생 등록', kind: 'milestone', memory: true,
    body: `${townOf(state).region}지방 ${townOf(state).name}. ${state.family}의 품에서 태어났다. 이웃집에는 동갑내기 ${state.cast.friend.name}가 산다. `
      + (h ? `${h.generation}대째 트레이너 가문이다. ${josa(h.ancestor, '이', '가')} 남긴 ${poke(h.egg, '의', '의')} 알${hasRule(state, 'poor') ? '을' : `과 유산 ${h.inheritance.toLocaleString()}P를`} 물려받았다. 알은 6세에 부화해 첫 파트너가 된다. `
        : '6세에 첫 파트너를 만나고 ')
      + '7세에 배울 방식을 정한다.' });
  return state;
}

// ── Yearly simulation ──
function yearlyEconomy(s) {
  const regionId = currentRegion(s), factor = economyFactor(s, regionId), economy = regionState(s, regionId).economy;
  if (inPrison(s)) { s.ledger = { income: 0, expense: 0 }; return; }
  let income = 0;
  if (s.career && !s.work.retired) {
    s.work.years += 1;
    s.work.satisfaction = clamp(s.work.satisfaction - between(s, 0, 3) + (s.reputation > 50 ? 1 : 0), 0, 100);
    income = CAREERS[s.career].income * (hasPerk(s, 'amulet-coin') ? 1.1 : 1) * (1 + (s.careerRank || 0) * 0.15) * factor * (s.career === 'merchant' ? factor : 1) * (1 + s.reputation / 200) * (s.work.cut > 0 ? 0.5 : 1);
    if (s.work.cut > 0 && s.work.cut < 99) s.work.cut -= 1;
  } else if (s.work.retired) income = 100 + s.reputation * 2;
  else if (s.age >= 18) income = 80 * factor;
  income *= diff(s, 'income');
  const married = s.relationship.status === 'married';
  const expense = s.age >= 18 ? (130 + (married ? 70 : 0) + s.relationship.children * 110 - (s.flags.homeowner ? 70 : 0)) * (0.75 + economy / 200) * diff(s, 'expense') : 0;
  s.game.balls = Math.min(30, s.game.balls + diff(s, 'balls'));
  // Comfortable households spend part of their savings on living well.
  const leisure = Math.max(0, s.money - 4000) * 0.05;
  if (leisure > 0) apply(s, { joy: 1 });
  s.ledger = { income: Math.round(income), expense: Math.round(expense + leisure) };
  s.money = Math.max(0, Math.round(s.money - leisure));
  // Living costs that savings cannot cover become debt (see sim/standing.js for interest and bankruptcy).
  const balance = Math.round(s.money + income - expense);
  if (balance < 0) { s.debt = (s.debt || 0) - balance; s.flags.shortfalls = (s.flags.shortfalls || 0) + 1; }
  s.money = Math.max(0, balance);
}

// Stats drift back toward a baseline every year, so they reflect how someone lives now rather than a lifetime total.
function yearlyDrift(s) {
  const vitalityBase = 90 - Math.max(0, s.age - 30) * 0.8 - ((s.debt || 0) > 0 ? 3 : 0);
  // Happiness settles where life actually is: debt, an empty wallet, prison and poor health pull the baseline down.
  const joyBase = 60 - ((s.debt || 0) > 0 ? 8 : 0) - (s.money <= 0 ? 6 : 0) - (inPrison(s) ? 15 : 0) - (s.stats.vitality < 40 ? 6 : 0)
    + (s.relationship.status === 'married' ? 3 : 0) + (s.party.length ? 2 : 0);
  const drift = { joy: [joyBase, 0.15], vitality: [vitalityBase, 0.1], courage: [40, 0.08], wisdom: [40, 0.08], bond: [40, 0.08] };
  const pull = diff(s, 'drift');
  for (const [key, [base, rate]] of Object.entries(drift)) {
    const gap = s.stats[key] - base;
    if (gap > 0 || key === 'vitality' || key === 'joy') s.stats[key] = clamp(Math.round(s.stats[key] - gap * rate * pull), 0, 100);
  }
  if (s.reputation > 20) s.reputation -= 1;
}

function yearlyGrowth(s) {
  yearlyDrift(s);
  const growth = EDUCATION_GROWTH[s.education];
  if (growth && s.age < 30) apply(s, { [growth]: 1 });
  if (s.party.length) apply(s, { bond: 1 });
  growParty(s, annualTraining(s));
}

// Challenge rule "떠돌이 운명": every few years the trainer moves to a town in another region.
function wander(s) {
  const here = townOf(s);
  s.town = pick(s, TOWNS.filter(t => t.map !== here.map)).id;
  if (!s.visited.includes(s.town)) s.visited.push(s.town);
  const there = townOf(s);
  return { kind: 'life', automatic: true, title: '떠돌이 운명', effects: { wisdom: 2 },
    body: `${here.region}지방을 떠나 ${there.region}지방 ${josa(there.name, '으로', '로')} 거처를 옮겼다. 낯선 길이 또 시작된다.` };
}

function ending(s) {
  s.ended = true;
  return log(s, { kind: 'ending', title: '생애 종료', memory: true,
    body: `${s.name}의 생애가 ${s.age}세에 끝났다. 방문 마을 ${s.visited.length}곳, 관측 포켓몬 ${s.seen.length}종, 함께한 포켓몬 ${s.party.length + s.box.length}마리. 기록을 내보내거나 새 게임을 시작할 수 있다.` });
}

function advanceYear(input) {
  const s = structuredClone(input);
  s.age += 1;
  s.season = Math.floor(random(s) * 4);
  if (s.age >= 105 || (s.age >= 60 && (s.age >= s.lifespan || random(s) < (100 - s.stats.vitality) / 3500 * diff(s, 'death')))) return ending(s);

  yearlyEconomy(s);
  yearlyGrowth(s);
  // Arrest, release and bankruptcy are the year's main record; smaller standing notes go to the queue.
  const standing = tickStanding(s), turning = standing.find(r => r.kind === 'milestone');
  queue(s, standing.filter(r => r !== turning));
  queue(s, tickWorld(s));
  queue(s, tickPeople(s));
  const evolutions = evolveMembers(s);
  queue(s, [reorganize(s)]);
  queue(s, resolveEchoes(s));
  if (hasRule(s, 'wanderer') && s.age >= 16 && s.age % WANDER_EVERY === 1) queue(s, [wander(s)]);
  recordYear(s);

  if (s.age === 6 && s.heritage) {
    const h = s.heritage;
    return log(s, { kind: 'encounter', title: '물려받은 알의 부화', memory: true, effects: { bond: 24, joy: 12 },
      body: `${josa(h.ancestor, '이', '가')} 남긴 알이 부화했다. ${poke(h.egg, '이', '가')} 첫 파트너가 되었다. 선대의 ${poke(h.parent, '과', '와')} 같은 계열이지만 새로운 개체다.`,
      encounter: { type: 'partner', pokemonId: h.egg, shiny: h.shiny, join: true, title: '물려받은 알의 부화', subtitle: 'INHERITED EGG HATCHED', body: '선대가 남긴 알에서 첫 파트너가 태어났다.' } });
  }
  if (s.age === 6) {
    return log(s, { kind: 'encounter', title: '첫 파트너 등록', effects: { bond: 20, joy: 10 },
      body: s.starter ? '가문이 대대로 함께해 온 포켓몬 계열에서 첫 파트너를 맞았다. 이제 생활 속 배틀·포획·훈련 사건에서 파트너와 함께 결정한다.'
        : '마을 연구소에서 첫 파트너를 등록했다. 이제 생활 속 배틀·포획·훈련 사건에서 파트너와 함께 결정한다.',
      encounter: { type: 'partner', pokemonId: s.starter || pick(s, townOf(s).pool), join: true, title: '첫 파트너 등록', subtitle: 'PARTNER REGISTERED', body: '첫 파트너가 생겼다.' } });
  }
  if (s.age === 10) {
    const npc = townOf(s).region === '관동' ? 'oak' : 'steven';
    return log(s, { kind: 'encounter', title: '공식 트레이너와의 만남', effects: { wisdom: 10, courage: 6 },
      body: `${NPCS[npc].name}에게 배틀과 도감 수집에 관한 조언을 받았다. 다른 지방의 소식에도 귀를 기울이게 되었다.`,
      encounter: { type: 'npc', npc, title: '공식 트레이너와의 만남', subtitle: 'TRAINER ENCOUNTER', body: '' } });
  }
  const milestone = milestoneEvent(s);
  if (milestone) { queue(s, evolutions); return log(s, milestone); }
  if (turning) { queue(s, evolutions); return log(s, { ...turning, memory: true }); }
  if (s.career && !s.work.retired && s.age >= 70) {
    s.work.retired = true; queue(s, evolutions);
    return log(s, { kind: 'milestone', title: '정년 은퇴', body: '정규 일을 마치고 연금 생활을 시작했다. 연금은 쌓아 온 명성에 따라 달라진다.', effects: { joy: 6, vitality: 3 } });
  }
  const partnerEvolution = evolutions.find(e => e.partner);
  if (partnerEvolution && !s.flags.partnerEvolved) {
    s.flags.partnerEvolved = true;
    queue(s, evolutions.filter(e => e !== partnerEvolution));
    return log(s, { kind: 'encounter', title: '파트너 진화', body: '파트너가 성장 조건을 충족해 진화했다. 도감 정보가 갱신되었다.', effects: { bond: 8, joy: 8 },
      encounter: { type: 'evolution', pokemonId: partnerEvolution.to, oldId: partnerEvolution.from, title: '파트너 진화', subtitle: 'EVOLUTION', body: '파트너가 진화했다.' } });
  }
  queue(s, evolutions);
  const event = takeDueChoice(s) || directEvent(s);
  return log(s, event || { title: '조용한 한 해', body: `${townOf(s).name}에서 특별한 일 없이 한 해가 지나갔다.`, effects: { joy: 2 } });
}

export function advance(input) {
  if (input.ended || input.pending || input.encounter) return input;
  if (!input.scheduledEvent) return advanceYear(input);
  const s = structuredClone(input);
  if (recordsSinceDecision(s) < recordGap(s)) return log(s, nextFiller(s));
  const event = s.scheduledEvent;
  delete s.scheduledEvent;
  return log(s, event);
}

// ── Decisions ──
const TONE_BY_STAT = { courage: 'bold', wisdom: 'curious', bond: 'caring', money: 'pragmatic', joy: 'easygoing', vitality: 'easygoing' };
export function toneOf(choice) {
  if (choice.tone) return choice.tone;
  const [stat] = Object.entries(choice.effects || {}).filter(([k, v]) => v > 0 && TONE_BY_STAT[k]).sort((a, b) => b[1] - a[1])[0] || [];
  return TONE_BY_STAT[stat] || 'easygoing';
}

const VILLAIN_SPECIES = [24, 42, 89, 110, 229, 262, 461, 510, 560, 675, 715, 758];
const ACE_SPECIES = [149, 248, 373, 445, 635, 706, 784, 887, 998];
function opponentFor(s, kind) {
  if (kind === 'rival') return REGIONS.find(r => r.id === TOWNS.find(t => t.id === s.hometown).map).starters[hashSeed(s.cast.rival.name) % 3];
  if (kind === 'villain') return pick(s, VILLAIN_SPECIES);
  if (kind === 'league') return pick(s, ACE_SPECIES);
  if (kind === 'raid') return pick(s, GMAX);
  if (kind === 'gym') return pick(s, townOf(s).pool);
  return pick(s, townOf(s).pool);
}

function relocate(s, choice) {
  const here = townOf(s);
  if (choice.destination && TOWNS.some(t => t.id === choice.destination)) s.town = choice.destination;
  if (choice.move === 'region') s.town = pick(s, TOWNS.filter(t => t.map === here.map && t.id !== here.id)).id;
  else if (choice.move) s.town = pick(s, TOWNS.filter(t => t.id !== here.id)).id;
  if (choice.home) s.town = s.hometown;
  if (!s.visited.includes(s.town)) s.visited.push(s.town);
}

// Applies everything a choice (or a battle/challenge sub-result) does, except the battle itself.
function applyActions(s, a, origin) {
  apply(s, a.effects);
  if (a.world) shiftRegion(s, a.world);
  if (a.cast) changeCast(s, a.cast);
  if (a.education) s.education = a.education;
  if (a.career && a.career !== s.career) { s.career = a.career; s.careerRank = 0; s.work = { years: 0, satisfaction: 65, cut: 0, retired: false }; }
  if (a.promotion) { s.careerRank = Math.min(5, (s.careerRank || 0) + 1); s.work.satisfaction = clamp(s.work.satisfaction + 10, 0, 100); }
  if (a.leaveCareer) { s.career = null; s.careerRank = 0; }
  if (a.work) {
    s.work.satisfaction = clamp(s.work.satisfaction + (a.work.satisfaction || 0), 0, 100);
    if (a.work.cut) s.work.cut = Math.max(s.work.cut, a.work.cut);
    if (a.work.retired) s.work.retired = true;
  }
  if (a.flag) s.flags[a.flag] = true;
  if (a.unflag) delete s.flags[a.unflag];
  if (a.loan) takeLoan(s, Math.min(a.loan, LOAN_LIMIT));
  if (a.prison) { s.prison = Math.max(s.prison || 0, a.prison); if (s.career === 'syndicate') { s.career = null; s.careerRank = 0; } }
  if (a.career === 'syndicate') s.flags['syndicate-region'] = currentRegion(s);
  if (a.losePokemon) loseMember(s, a.losePokemon);
  relocate(s, a);
  if (a.relationship) resolveRelationship(s, a.relationship);
  if (a.join) {
    const joined = addPokemon(s, a.join, { origin: a.joinOrigin || 'adopted', affection: a.joinOrigin === 'legend' ? 55 : a.joinLevel ? 70 : 40, xp: a.joinLevel ? (a.joinLevel - 5) * 25 : 0 });
    if (a.joinNickname) joined.member.nickname = a.joinNickname;
    queue(s, [joined.record]);
  }
  if (a.captureJoin) {
    queue(s, [addPokemon(s, a.captureJoin, { xp: Math.floor((partnerOf(s)?.xp || 0) * 0.65) }).record]);
    s.game.catches += 1;
  }
  if (a.observe && !s.seen.includes(a.observe)) s.seen.push(a.observe);
  if (a.affection) for (const member of s.party) member.affection = clamp(member.affection + a.affection, 0, 100);
  if (a.training) { trainParty(s, a.training); queue(s, evolveMembers(s)); }
  if (a.equipment && !s.game.gear.includes(a.equipment)) {
    s.game.gear.push(a.equipment);
    if (a.equipment === 'mega') s.game.megaStones = Object.keys(MEGA).map(Number);
    if (a.equipment === 'z') s.game.crystals = [...ALL_TYPES];
  }
  if (a.follow) plantSeeds(s, a.follow, origin);
}

// A companion leaves for good (ran away, was stolen, died of illness). Never the first partner or a legendary;
// 'box' takes from the box first, 'party' from the party, 'random' from both. Records the loss as a party entry.
function loseMember(s, how) {
  const pools = how === 'box' ? [s.box, s.party] : how === 'party' ? [s.party, s.box] : [[...s.party, ...s.box]];
  for (const pool of pools) {
    const candidates = pool.filter(m => !m.locked && m.origin !== 'partner');
    if (!candidates.length) continue;
    const member = pick(s, candidates);
    s.party = s.party.filter(m => m !== member); s.box = s.box.filter(m => m !== member);
    if (s.partyPlan) s.partyPlan = { ...s.partyPlan, pinned: s.partyPlan.pinned.filter(uid => uid !== member.uid) };
    s.flags.lost = (s.flags.lost || 0) + 1;
    queue(s, [{ kind: 'party', automatic: true, title: '떠난 동료', effects: { bond: -3 }, body: `${poke(member.id, '이', '가')} 더는 곁에 없다. ${member.joined}세부터 ${s.age - member.joined}년을 함께한 몬스터볼이 비어 있다.` }]);
    return member;
  }
  return null;
}

function runBattle(s, choice, origin) {
  const legacy = choice.simulation && { kind: choice.simulation === 'capture' ? 'wild' : choice.simulation, capture: choice.simulation === 'capture', opponent: choice.target };
  const spec = choice.battle || legacy;
  if (!spec) return '';
  if (!s.party.length) return ' 아직 파트너가 없어 현장 관찰로 대신했다.';
  if (spec.kind === 'gym' && (s.game.badges[currentRegion(s)] || 0) >= 8) return ' 이 지방의 배지는 이미 모두 모았다. 대신 후배들의 연습 상대가 되어 주었다.';
  const opponents = spec.opponents || [spec.opponent ?? opponentFor(s, spec.kind)];
  let result, text = '';
  for (const [index, opponentId] of opponents.entries()) {
    // A gym expedition ends early once this region's eight badges are complete.
    if (index > 0 && spec.kind === 'gym' && (s.game.badges[currentRegion(s)] || 0) >= 8) { text += ' 이 지방의 배지 8개를 모두 모아 원정을 마쳤다.'; break; }
    if (!s.seen.includes(opponentId)) s.seen.push(opponentId);
    // League and facility series pay their prize once, after the last battle; every gym in an expedition pays its own.
    const reward = !['league', 'facility'].includes(spec.kind) || index === opponents.length - 1;
    result = autoBattle(s, { kind: spec.kind, opponentId, regionId: currentRegion(s), allowCapture: Boolean(spec.capture), level: spec.levels?.[index] ?? spec.level, reward });
    text += ` ${opponents.length>1?`${index+1}/${opponents.length}차전 · `:''}${poke(opponentId)} 상대. ${battleSummary(result, id => poke(id, '을', '를'))}`;
    // Stage flags are kept as soon as their battle is won, so a later loss does not erase them.
    if (['win', 'caught'].includes(result.result) && spec.flags?.[index]) s.flags[spec.flags[index]] = true;
    if (result.captured) {
      const { record } = addPokemon(s, result.captured, { xp: Math.max(0, (result.level - 5) * 25) });
      text += ` ${poke(result.captured, '이', '가')} 파티에 합류했다.${record ? ' 파티가 가득 차 구성을 다시 짰다.' : ''}`;
      queue(s, [record]);
    }
    if (!['win','caught'].includes(result.result)) break;
  }
  queue(s, evolveMembers(s));
  const after = choice.after?.[['win', 'caught'].includes(result.result) ? 'win' : 'lose'];
  if (after) { applyActions(s, after, origin); if (after.outcome) text += ` ${after.outcome}`; }
  return text;
}

/**
 * Resolves choice `index` of `entry` on `s` (mutated): stat check, effects, battles, contests, disposition.
 * Returns false when the choice cannot be taken. Player decisions also start the follow-up activity records.
 */
function resolveChoice(s, entry, index, { auto = false } = {}) {
  let choice = entry?.choices?.[index];
  if (!choice || (choice.cost || 0) > s.money) return false;
  let check;
  if (choice.challenge) {
    const chanceValue = successChance(s, choice), roll = random(s) * 100, success = roll < chanceValue;
    check = { chance: chanceValue, roll, success, stat: choice.challenge.stat };
    const result = success ? choice : { label: choice.label, tone: choice.tone, ...choice.challenge.failure };
    // The cost (e.g. an entry fee) is paid whatever the outcome.
    choice = { ...result, effects: { ...result.effects, money: (result.effects?.money || 0) - (choice.cost || 0) } };
  }
  const origin = { age: entry.age, title: entry.title, label: choice.label };
  applyActions(s, choice, origin);
  const battleText = runBattle(s, choice, origin) + (choice.contest ? runContest(s, choice.contest) : '');
  const tone = toneOf(choice);
  s.disposition[tone] = (s.disposition[tone] || 0) + 1;

  entry.resolution = { index, label: choice.label, text: `${choice.outcome}${battleText}`, effects: choice.effects || {}, tone };
  if (check) entry.resolution.check = check;
  if (choice.follow?.length || choice.after) entry.resolution.lasting = true;
  entry.newTown = s.town;
  if (auto) return true;

  const mode = ['school', 'home', 'academy', 'study'].includes(choice.education) ? 'wisdom' : choice.relationship ? 'bond'
    : Object.keys(STAT_LABELS).sort((a, b) => (choice.effects?.[b] || 0) - (choice.effects?.[a] || 0))[0];
  s.activity = { label: choice.label, mode, parentId: entry.id, step: 0, failed: check?.success === false };
  return true;
}

export function choose(input, index) {
  if (!input.pending || input.encounter) return input;
  const s = structuredClone(input);
  const entry = s.log.find(e => e.id === s.pending);
  if (!entry?.choices?.[index] || (entry.choices[index].cost || 0) > s.money) return input;
  s.pending = null;
  resolveChoice(s, entry, index);
  return s;
}

export function acknowledge(input) { return { ...input, encounter: null }; }

/** Plays forward until the next player decision, special encounter or the end (at most `limit` records). */
export function fastForward(input, limit = 60) {
  let s = input;
  for (let i = 0; i < limit && !s.ended && !s.pending && !s.encounter; i++) s = advance(s);
  return s;
}
export function toggleMemory(input, id) {
  return { ...input, memories: input.memories.includes(id) ? input.memories.filter(x => x !== id) : [...input.memories, id] };
}

/** Lets the character decide by themselves: options that fit their personality and look winnable are preferred. */
// The character's own pick: options that fit their personality and goal and look winnable. Returns -1 if none.
function pickChoice(s, entry) {
  const total = Object.values(s.disposition).reduce((a, b) => a + b, 0) || 1;
  const options = entry.choices.map((c, i) => ({ c, i })).filter(({ c }) => !c.cost || c.cost <= s.money);
  const picked = weighted(s, options, ({ c }) => (0.5 + 3 * (s.disposition[toneOf(c)] || 0) / total) * (c.challenge ? 0.3 + successChance(s, c) / 100 : 1) * goalFit(s, c));
  return picked ? picked.i : -1;
}

export function autoChoice(input) {
  if (!input.pending) return input;
  const s = structuredClone(input);
  const index = pickChoice(s, s.log.find(e => e.id === s.pending));
  return index >= 0 ? choose(s, index) : s;
}
