import { createTalent, TALENT_FIELDS } from './talent.js';
// Save parsing: validates untrusted JSON; v1 → world simulation v2 → innate talents v3 → goal, party plan, heritage v4
// → yearly history, perks, challenge rules and a chosen starter v5 → infamy, debt and prison v6 → difficulty v7.
import { TOWNS, CAREERS, NPCS } from '../data/world.js';
import { CONSEQUENCES } from '../data/consequences.js';
import { STAT_LABELS, EFFECT_LABELS, GENDERS } from './labels.js';
import { WORLD_KEYS, CONDITIONS, createWorld } from './world.js';
import { createCast, PATHS } from './people.js';
import { freshGear, BATTLE_KINDS, MECHANICS, ALL_TYPES } from './battle.js';
import { hashSeed } from './random.js';
import { DISPOSITIONS, isLegendary, PARTY_LIMIT, PARTY_MODES } from './party.js';
import { GOALS } from './goals.js';
import { validHeritage } from './legacy.js';
import { validHistoryRow, HISTORY_LIMIT } from './history.js';
import { PERKS, RULES, PERK_SLOTS } from './perks.js';
import { NICKNAME_LIMIT, MEMBER_EVOLUTIONS, MEMBER_RIBBONS } from './party.js';
import { CONTEST_CATEGORIES, CONTEST_RANKS } from './contest.js';
import { LOAN_LIMIT, PRISON_MAX } from './standing.js';
import { DIFFICULTIES } from './difficulty.js';
import { REGIONS } from '../data/regions.js';

export const SAVE_VERSION = 7;
const ENCOUNTER_TYPES = ['partner', 'npc', 'legendary', 'shiny', 'evolution'];
const ORIGINS = ['partner', 'wild', 'adopted', 'starter', 'legend', 'egg', 'gift', 'rescued', 'stolen'];

const isObject = v => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const int = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
const num = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;
const text = (v, max = 600) => typeof v === 'string' && v.length <= max;
const list = (v, max, each) => Array.isArray(v) && v.length <= max && v.every(each);
const speciesId = id => int(id, 1, 1025);
const townId = id => TOWNS.some(t => t.id === id);
const regionId = id => REGIONS.some(r => r.id === id);
const shift = (value, keys) => value === undefined || isObject(value) && Object.entries(value).every(([k, v]) => k in keys && Number.isFinite(v));

// Everything a choice can do (also used for challenge failures and post-battle results).
function validActions(a) {
  return isObject(a) && shift(a.effects, EFFECT_LABELS) && shift(a.world, WORLD_KEYS)
    && (a.cost === undefined || num(a.cost, 0, 1e7)) && (!a.career || Boolean(CAREERS[a.career])) && (!a.join || speciesId(a.join))
    && (!a.joinOrigin || ORIGINS.includes(a.joinOrigin)) && (a.joinLevel === undefined || int(a.joinLevel, 5, 100)) && (a.joinNickname === undefined || text(a.joinNickname, NICKNAME_LIMIT) && a.joinNickname.length > 0) && (!a.observe || speciesId(a.observe)) && (!a.destination || townId(a.destination))
    && (a.move === undefined || [true, false, 'region', 'random'].includes(a.move)) && (!a.equipment || a.equipment in MECHANICS)
    && (a.training === undefined || num(a.training, 0, 10000)) && (!a.captureJoin || speciesId(a.captureJoin)) && (a.affection === undefined || num(a.affection, -100, 100)) && (!a.tone || a.tone in DISPOSITIONS)
    && (a.cast === undefined || isObject(a.cast) && Object.values(a.cast).every(isObject))
    && (a.follow === undefined || list(a.follow, 5, f => isObject(f) && Boolean(CONSEQUENCES[f.id])))
    && (a.battle === undefined || isObject(a.battle) && BATTLE_KINDS.includes(a.battle.kind) && (a.battle.opponent === undefined || speciesId(a.battle.opponent))
      && (a.battle.level === undefined || int(a.battle.level,1,100))
      && (a.battle.opponents === undefined || ['league', 'gym', 'facility'].includes(a.battle.kind) && list(a.battle.opponents,12,speciesId) && a.battle.opponents.length>0 && !a.battle.capture)
      && (a.battle.levels === undefined || Array.isArray(a.battle.opponents) && list(a.battle.levels,12,n => int(n,1,100)) && a.battle.levels.length === a.battle.opponents.length)
      && (a.battle.flags === undefined || Array.isArray(a.battle.opponents) && list(a.battle.flags,12,f => f === null || text(f, 60)) && a.battle.flags.length === a.battle.opponents.length))
    && (a.simulation === undefined || ['capture', 'gym', 'raid'].includes(a.simulation))
    && (a.loan === undefined || num(a.loan, 1, LOAN_LIMIT)) && (a.prison === undefined || int(a.prison, 1, PRISON_MAX))
    && (a.losePokemon === undefined || ['random', 'box', 'party'].includes(a.losePokemon))
    && (a.contest === undefined || isObject(a.contest) && Object.hasOwn(CONTEST_CATEGORIES, a.contest.category) && int(a.contest.rank, 0, CONTEST_RANKS.length - 1))
    && (a.after === undefined || isObject(a.after) && Object.values(a.after).every(validActions));
}
const validChoice = c => validActions(c) && text(c.label, 200) && text(c.description, 300) && text(c.outcome)
  && (!c.challenge || (c.challenge.talent === undefined || Object.hasOwn(TALENT_FIELDS, c.challenge.talent)) && c.challenge.stat in STAT_LABELS && Number.isFinite(c.challenge.difficulty) && text(c.challenge.failure?.outcome) && validActions(c.challenge.failure));
const validEncounter = e => isObject(e) && ENCOUNTER_TYPES.includes(e.type) && text(e.title) && text(e.body) && (e.shiny === undefined || typeof e.shiny === 'boolean')
  && (e.type === 'npc' ? Boolean(NPCS[e.npc]) : speciesId(e.pokemonId));
const validEvent = e => isObject(e) && text(e.title) && text(e.body, 2000) && shift(e.effects, EFFECT_LABELS)
  && (!e.encounter || validEncounter(e.encounter)) && (!e.choices || list(e.choices, 8, validChoice) && e.choices.length > 0);
const validEntry = (s, e) => validEvent(e) && text(e.id, 80) && int(e.age, 0, s.age) && int(e.season, 0, 3) && townId(e.town)
  && (!e.partnerId || speciesId(e.partnerId))
  && (!e.resolution || text(e.resolution.label, 200) && text(e.resolution.text, 2000) && shift(e.resolution.effects, EFFECT_LABELS));
// Member records (battles, wins, where they met, evolutions, ribbons, nickname) are optional so that members
// written by older code or other tools stay valid.
const validMember = (s, m) => isObject(m) && int(m.uid, 1, 1e6) && speciesId(m.id) && int(m.joined, 0, s.age) && typeof m.shiny === 'boolean'
  && int(m.xp, 0, 1e6) && num(m.affection, 0, 100) && ORIGINS.includes(m.origin) && (!m.locked || isLegendary(m.id))
  && (m.battles === undefined || int(m.battles, 0, 1e6)) && (m.wins === undefined || int(m.wins, 0, m.battles ?? 1e6))
  && (m.met === undefined || townId(m.met)) && (m.nickname === undefined || text(m.nickname, NICKNAME_LIMIT) && m.nickname.length > 0)
  && (m.evolutions === undefined || list(m.evolutions, MEMBER_EVOLUTIONS, e => Array.isArray(e) && e.length === 2 && int(e[0], 0, s.age) && speciesId(e[1])))
  && (m.ribbons === undefined || list(m.ribbons, MEMBER_RIBBONS, r => text(r, 40)));
const validGame = g => isObject(g) && isObject(g.badges) && Object.entries(g.badges).every(([k, n]) => regionId(k) && int(n, 0, 8))
  && list(g.gear, 5, k => k in MECHANICS) && list(g.megaStones, 200, speciesId) && list(g.crystals, 18, t => ALL_TYPES.includes(t))
  && list(g.gmax, 100, speciesId) && ALL_TYPES.includes(g.teraType) && int(g.balls, 0, 1e6) && int(g.wins, 0, 1e6) && int(g.catches, 0, 1e6);
const validWorld = w => isObject(w) && isObject(w.regions) && REGIONS.every(r => isObject(w.regions[r.id]) && Object.keys(WORLD_KEYS).every(k => num(w.regions[r.id][k], 0, 100)))
  && list(w.conditions, 40, c => isObject(c) && c.id in CONDITIONS && regionId(c.region) && Number.isInteger(c.until));
const validCast = c => isObject(c) && ['friend', 'rival', 'family'].every(id => isObject(c[id]))
  && Object.values(c).every(p => isObject(p) && text(p.name, 30) && (p.path === undefined || p.path in PATHS) && (p.affinity === undefined || num(p.affinity, 0, 100)));

const validPlan = s => isObject(s.partyPlan) && Object.hasOwn(PARTY_MODES, s.partyPlan.mode)
  && list(s.partyPlan.pinned, PARTY_LIMIT, uid => [...s.party, ...s.box].some(m => m.uid === uid)) && new Set(s.partyPlan.pinned).size === s.partyPlan.pinned.length;

function validState(s) {
  return Object.hasOwn(GOALS, s.goal) && (s.heritage === null || validHeritage(s.heritage))
    && list(s.history, HISTORY_LIMIT, row => validHistoryRow(row, s.age, townId))
    && list(s.perks, PERK_SLOTS, id => Object.hasOwn(PERKS, id)) && new Set(s.perks).size === s.perks.length
    && list(s.rules, Object.keys(RULES).length, id => Object.hasOwn(RULES, id)) && new Set(s.rules).size === s.rules.length
    && (s.starter === null || speciesId(s.starter) && !isLegendary(s.starter))
    && num(s.infamy, 0, 100) && num(s.debt, 0, 1e7) && int(s.prison, 0, PRISON_MAX) && Object.hasOwn(DIFFICULTIES, s.difficulty)
    && isObject(s.talent) && Object.hasOwn(TALENT_FIELDS, s.talent.field) && int(s.talent.level, 1, 5)
    && text(s.name, 12) && text(s.seed, 40) && typeof s.family === 'string' && typeof s.trait === 'string' && Object.hasOwn(GENDERS, s.gender)
    && int(s.age, 0, 105) && Number.isInteger(s.rng) && typeof s.ended === 'boolean' && !(s.ended && s.age < 60) && int(s.season, 0, 3)
    && townId(s.town) && townId(s.hometown) && int(s.lifespan, 60, 106)
    && isObject(s.stats) && Object.keys(STAT_LABELS).every(k => num(s.stats[k], 0, 100))
    && num(s.money, 0, 1e9) && num(s.reputation, 0, 100) && (!s.career || Boolean(CAREERS[s.career])) && int(s.careerRank ?? 0, 0, 5)
    && (s.lastWildOffer === undefined || int(s.lastWildOffer, 0, 105))
    && isObject(s.disposition) && Object.entries(s.disposition).every(([k, v]) => k in DISPOSITIONS && int(v, 0, 1e5))
    && isObject(s.work) && int(s.work.years, 0, 120) && num(s.work.satisfaction, 0, 100) && int(s.work.cut, 0, 99)
    && isObject(s.flags) && isObject(s.cooldowns) && isObject(s.background) && typeof s.background.environment === 'string'
    && isObject(s.relationship) && typeof s.relationship.name === 'string' && int(s.relationship.chapter, 0, 18)
    && list(s.log, 1500, e => validEntry(s, e)) && s.log.length > 0 && new Set(s.log.map(e => e.id)).size === s.log.length
    && list(s.memories, 1500, id => s.log.some(e => e.id === id)) && list(s.seen, 1025, speciesId) && list(s.visited, 40, townId)
    && list(s.used, 2000, id => typeof id === 'string') && list(s.party, PARTY_LIMIT, m => validMember(s, m)) && list(s.box, 400, m => validMember(s, m))
    && list(s.people, 20, p => isObject(p) && Boolean(NPCS[p.id]) && int(p.age, 0, s.age))
    && list(s.seeds, 100, seed => isObject(seed) && Boolean(CONSEQUENCES[seed.id]) && Number.isInteger(seed.at) && isObject(seed.origin))
    && list(s.queue, 20, validEvent) && Array.isArray(s.party) && Array.isArray(s.box) && validPlan(s) && validGame(s.game) && validWorld(s.world) && validCast(s.cast)
    && (!s.pending || s.log.some(e => e.id === s.pending && Array.isArray(e.choices)))
    && (!s.encounter || s.log.some(e => e.id === s.encounter.logId) && validEncounter(s.encounter))
    && (!s.scheduledEvent || !s.pending && validEvent(s.scheduledEvent) && Array.isArray(s.scheduledEvent.choices))
    && (!s.activity || s.activity.mode in STAT_LABELS && typeof s.activity.label === 'string' && int(s.activity.step, 0, 1e5));
}

// Version 1 saves had a manual field/battle layer and no world, cast or PC box.
function migrateV1(old) {
  const s = structuredClone(old);
  let roll = hashSeed(`${s.seed}-migration`);
  const next = () => (roll = (Math.imul(roll, 1664525) + 1013904223) >>> 0) / 4294967296;
  s.gender ??= 'unspecified';
  s.season ??= 0;
  s.lifespan ??= Math.max(s.age + 1, 64 + hashSeed(`${s.seed}lifespan`) % 37);
  s.background ??= { id: 'legacy', family: s.family, wealth: '기존 기록', home: '기존 거주지', environment: TOWNS.find(t => t.id === s.town)?.environment || '' };
  s.relationship ??= { name: '유진', status: 'single', chapter: 0, trust: 20, children: 0 };
  const g = isObject(s.game) ? s.game : {};
  s.game = { ...freshGear(), ...Object.fromEntries(Object.entries(g).filter(([k]) => k in freshGear())) };
  if (!ALL_TYPES.includes(s.game.teraType)) s.game.teraType = '노말';
  s.nextUid = 0;
  const member = (m, origin) => ({
    uid: ++s.nextUid, id: m.id, joined: m.joined, shiny: m.shiny, xp: Number.isInteger(m.xp) ? m.xp : Math.max(0, (s.age - m.joined) * 5),
    affection: 50, origin, ...(isLegendary(m.id) ? { locked: true } : {}),
  });
  s.party = (Array.isArray(s.party) ? s.party : []).map((m, i) => member(m, i === 0 ? 'partner' : 'wild'));
  // Saves from the career-balance update already kept overflow Pokémon in a storage box.
  s.box = (Array.isArray(s.box) ? s.box : []).map(m => member(m, 'wild'));
  s.careerRank ??= 0;
  s.reputation = Math.min(60, 5 + Object.values(s.game.badges).reduce((a, b) => a + b, 0) * 2);
  s.disposition = { bold: 0, curious: 0, caring: 0, pragmatic: 0, easygoing: 0 };
  s.work = { years: s.career ? Math.max(0, s.age - 16) : 0, satisfaction: 60, cut: 0, retired: s.age >= 65 };
  s.world = createWorld(s, next);
  s.cast = createCast(s, values => values[Math.floor(next() * values.length)]);
  if (s.age >= 12) Object.assign(s.cast.rival, { met: true, path: 'trainer', power: Math.min(80, 15 + s.age) });
  if (s.age >= 12) s.cast.friend.path = s.age >= 20 ? 'worker' : 'student';
  s.seeds = []; s.queue = []; s.cooldowns = {};
  s.version = 2;
  return s;
}

export function parseSave(raw) {
  try {
    let s = JSON.parse(raw);
    if (!isObject(s)) return null;
    if (s.version === 1) s = migrateV1(s);
    if (s.version === 2) { s.talent = createTalent(s.seed); s.version = 3; }
    // v4: the player's life goal, party management (pins / manual mode) and the inherited egg. Old lives start neutral.
    if (s.version === 3) { s.goal = 'free'; s.partyPlan = { mode: 'auto', pinned: [] }; s.heritage = null; s.version = 4; }
    // v5: yearly history starts empty for an old life; no perks, no challenge rules, no chosen starter.
    if (s.version === 4) { s.history = []; s.perks = []; s.rules = []; s.starter = null; s.version = 5; }
    // v6: infamy, debt and prison. An old life has none of them.
    if (s.version === 5) { s.infamy = 0; s.debt = 0; s.prison = 0; s.version = 6; }
    // v7: a difficulty setting. Old lives were played on the normal rules.
    if (s.version === 6) { s.difficulty = 'normal'; s.version = 7; }
    s.gender ??= 'unspecified';
    return s.version === SAVE_VERSION && validState(s) ? s : null;
  } catch {
    return null;
  }
}
