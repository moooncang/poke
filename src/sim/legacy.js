// Things that outlive a single life: ending cards, medals, the trainer card, a cumulative Pokédex, a hall of past
// lives and the egg handed down to the next generation. Everything here is a pure function of saved state, so the
// UI can keep the legacy in its own storage key (LEGACY_KEY) next to the life save and nothing in a life depends on
// the browser it was played in. The only thing a new life receives is `heritage` (see heritageFor/createLife).
import { LEGENDARY } from '../data/species-rules.js';
import { TOWNS } from '../data/world.js';
import { xpLevel, championships } from './battle.js';
import { evolutionFamily } from './encounters.js';
import { goalOf } from './goals.js';
import { historyHighlights } from './history.js';
import { PERKS, cleanRules } from './perks.js';

export const LEGACY_KEY = 'pokelife.legacy.v1';
export const LEGACY_VERSION = 1;
export const LEGACY_LIVES = 60;
export const INHERITANCE_SHARE = 0.2;
export const INHERITANCE_CAP = 3000;
export { RARITIES, DEX_REGIONS, DEX_TOTAL, dexProgress, MEDAL_GROUPS, MEDALS, medalsOf, STARS, CARD_COLORS, CARD_KINDS, epithet, trainerCard, endingCards } from './achievements.js';
import { members, ownedSpecies, medalsOf, trainerCard, endingCards, MEDALS, DEX_TOTAL } from './achievements.js';

// ── Next generation ──
/** Eggs this life can hand down: one per evolution family, from non-legendary companions, closest bond first. */
export function heirCandidates(s) {
  const seen = new Set(), list = [];
  for (const m of [...members(s)].sort((a, b) => b.affection - a.affection || (b.origin === 'partner') - (a.origin === 'partner') || a.uid - b.uid)) {
    if (m.locked || LEGENDARY.has(m.id)) continue;
    const egg = evolutionFamily(m.id);
    if (seen.has(egg)) continue;
    seen.add(egg);
    list.push({ uid: m.uid, egg, parent: m.id, shiny: m.shiny, affection: m.affection, partner: m.origin === 'partner', nickname: m.nickname || null });
    if (list.length >= 6) break;
  }
  return list;
}

/**
 * What a new life receives from this one if the player hands down the egg of member `uid`: the egg, a small
 * inheritance, the lineage, and two people who may turn up later — the ancestor's own first partner (if it was not
 * legendary) and the name of the ancestor's rival.
 */
export function heritageFor(s, uid) {
  const candidate = heirCandidates(s).find(c => c.uid === uid);
  if (!candidate) return null;
  const partner = members(s).find(m => m.origin === 'partner' && !m.locked);
  return {
    egg: candidate.egg, parent: candidate.parent, shiny: candidate.shiny,
    ancestor: s.name, ancestorSeed: s.seed, hometown: s.hometown,
    generation: (s.heritage?.generation || 1) + 1,
    lineage: [...(s.heritage?.lineage || []), s.name].slice(-8),
    inheritance: Math.min(INHERITANCE_CAP, Math.floor(s.money * INHERITANCE_SHARE)),
    ...(partner ? { partner: { id: partner.id, level: xpLevel(partner), ...(partner.nickname ? { nickname: partner.nickname } : {}) } } : {}),
    ...(s.cast?.rival?.met ? { rival: s.cast.rival.name } : {}),
    titles: championships(s),
  };
}

/** Validates a heritage object (from storage, a save or heritageFor). */
export function validHeritage(h) {
  const int = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
  const name = v => typeof v === 'string' && v.length > 0 && v.length <= 12;
  return Boolean(h) && typeof h === 'object' && !Array.isArray(h) && int(h.egg, 1, 1025) && !LEGENDARY.has(h.egg) && int(h.parent, 1, 1025)
    && typeof h.shiny === 'boolean' && name(h.ancestor) && typeof h.ancestorSeed === 'string' && h.ancestorSeed.length <= 40
    && TOWNS.some(t => t.id === h.hometown) && int(h.generation, 2, 999) && int(h.inheritance, 0, INHERITANCE_CAP)
    && Array.isArray(h.lineage) && h.lineage.length <= 8 && h.lineage.every(name)
    && (h.partner === undefined || h.partner && int(h.partner.id, 1, 1025) && !LEGENDARY.has(h.partner.id) && int(h.partner.level, 1, 100) && (h.partner.nickname === undefined || name(h.partner.nickname)))
    && (h.rival === undefined || typeof h.rival === 'string' && h.rival.length > 0 && h.rival.length <= 30)
    && (h.titles === undefined || int(h.titles, 0, 9));
}

// ── The legacy store (kept by the UI under LEGACY_KEY) ──
const TOTAL_KEYS = ['lives', 'years', 'wins', 'titles', 'ribbons', 'symbols', 'seenMax', 'generations'];
export function emptyLegacy() {
  return { version: LEGACY_VERSION, lives: [], dex: { seen: [], owned: [], shiny: [] }, medals: {}, cards: {}, heir: null,
    totals: Object.fromEntries(TOTAL_KEYS.map(k => [k, 0])) };
}

const lifeKey = s => `${s.seed}:${s.age}:${s.log.length}`;

/** A compact record of a finished life for the hall. */
export function summarizeLife(s) {
  const partner = members(s).find(m => m.origin === 'partner');
  const high = historyHighlights(s);
  return {
    key: lifeKey(s), seed: s.seed, name: s.name, gender: s.gender, age: s.age, hometown: s.hometown, town: s.town,
    goal: goalOf(s), career: s.career, careerRank: s.careerRank || 0, generation: s.heritage?.generation || 1,
    ancestor: s.heritage?.ancestor || null, ancestorSeed: s.heritage?.ancestorSeed || null, card: trainerCard(s), medals: medalsOf(s),
    partner: partner ? { id: partner.id, shiny: partner.shiny, level: xpLevel(partner), years: s.age - partner.joined, ...(partner.nickname ? { nickname: partner.nickname } : {}) } : null,
    party: s.party.map(m => ({ id: m.id, shiny: m.shiny, level: xpLevel(m) })),
    cards: endingCards(s).map(c => ({ id: c.id, kind: c.kind, rarity: c.rarity, title: c.title })),
    rules: cleanRules(s.rules), perks: [...(s.perks || [])],
    peakMoney: Math.max(s.money, ...(s.history || []).map(r => r.money)), firstTitleAge: high?.firstTitleAge ?? null,
    peakInfamy: Math.max(s.infamy || 0, ...(s.history || []).map(r => r.infamy ?? 0)),
    decisions: s.log.filter(e => e.resolution).length,
  };
}

/** Adds a finished life to the legacy. Recording the same life twice changes nothing. Returns a new legacy. */
export function recordLife(legacy, s) {
  const base = parseLegacy(legacy);
  if (!s?.ended || base.lives.some(l => l.key === lifeKey(s))) return base;
  const next = structuredClone(base), summary = summarizeLife(s);
  next.lives = [summary, ...next.lives].slice(0, LEGACY_LIVES);
  const union = (list, ids) => [...new Set([...list, ...ids])].sort((a, b) => a - b);
  next.dex.seen = union(next.dex.seen, s.seen);
  next.dex.owned = union(next.dex.owned, ownedSpecies(s));
  next.dex.shiny = union(next.dex.shiny, members(s).filter(m => m.shiny).map(m => m.id));
  for (const id of summary.medals) next.medals[id] = next.medals[id] ? { ...next.medals[id], count: next.medals[id].count + 1 } : { first: s.name, count: 1 };
  for (const c of summary.cards) next.cards[c.id] = (next.cards[c.id] || 0) + 1;
  // Running totals survive even when old lives fall out of the hall.
  const t = next.totals;
  t.lives += 1; t.years += s.age; t.wins += s.game.wins; t.titles += summary.card.champions.length;
  t.ribbons += summary.card.ribbons; t.symbols += summary.card.symbols;
  t.seenMax = Math.max(t.seenMax, s.seen.length); t.generations = Math.max(t.generations, summary.generation);
  return next;
}

/** Remembers which egg the next life will hatch. Pass uid null to clear. */
export function chooseHeir(legacy, s, uid) {
  const next = structuredClone(parseLegacy(legacy));
  next.heir = uid === null ? null : heritageFor(s, uid);
  return next;
}

/** Validates stored legacy JSON (string or object); anything unreadable becomes an empty legacy. Older stores gain totals. */
export function parseLegacy(raw) {
  let value = raw;
  try { if (typeof raw === 'string') value = JSON.parse(raw); } catch { return emptyLegacy(); }
  const ids = v => Array.isArray(v) && v.length <= DEX_TOTAL && v.every(n => Number.isInteger(n) && n >= 1 && n <= DEX_TOTAL);
  const ok = value && typeof value === 'object' && value.version === LEGACY_VERSION && Array.isArray(value.lives) && value.lives.length <= LEGACY_LIVES
    && value.lives.every(l => l && typeof l.key === 'string' && typeof l.name === 'string' && l.card && Array.isArray(l.medals))
    && value.dex && ids(value.dex.seen) && ids(value.dex.owned) && ids(value.dex.shiny)
    && value.medals && typeof value.medals === 'object' && value.cards && typeof value.cards === 'object'
    && (value.heir === null || validHeritage(value.heir))
    && (value.totals === undefined || value.totals && TOTAL_KEYS.every(k => Number.isFinite(value.totals[k]) && value.totals[k] >= 0));
  if (!ok) return emptyLegacy();
  if (value.totals) return value;
  // Stores written before running totals existed: rebuild them from the lives they still hold.
  const lives = value.lives;
  return { ...value, totals: { lives: lives.length, years: lives.reduce((n, l) => n + l.age, 0), wins: lives.reduce((n, l) => n + (l.card.wins || 0), 0),
    titles: lives.reduce((n, l) => n + l.card.champions.length, 0), ribbons: lives.reduce((n, l) => n + (l.card.ribbons || 0), 0),
    symbols: lives.reduce((n, l) => n + (l.card.symbols || 0), 0), seenMax: Math.max(0, ...lives.map(l => l.card.seen || 0)),
    generations: Math.max(0, ...lives.map(l => l.generation || 1)) } };
}

/** Totals for the hall header. */
export function legacyTotals(legacy) {
  const l = parseLegacy(legacy);
  return {
    lives: l.totals.lives, years: l.totals.years, champions: l.totals.titles, wins: l.totals.wins, ribbons: l.totals.ribbons, symbols: l.totals.symbols,
    seen: l.dex.seen.length, owned: l.dex.owned.length, shiny: l.dex.shiny.length,
    medals: Object.keys(l.medals).length, medalTotal: MEDALS.length, cards: Object.keys(l.cards).length,
    generations: l.totals.generations, perks: Object.keys(PERKS).filter(id => perkUnlocked(l, id)).length, perkTotal: Object.keys(PERKS).length,
  };
}

// ── Family perks: unlocked by what earlier lives achieved ──
const medal = (l, id) => Boolean(l.medals[id]);
export const PERK_UNLOCKS = {
  'shiny-charm': { text: '누적 도감 관측 250종, 또는 ‘반짝이는 만남’ 메달 3회', test: l => l.dex.seen.length >= 250 || (l.medals.shiny?.count || 0) >= 3 },
  'exp-share': { text: '어느 삶에서든 리그 챔피언', test: l => medal(l, 'champion') },
  'amulet-coin': { text: '‘부호’ 메달', test: l => medal(l, 'rich') },
  'oval-charm': { text: '‘알에서 태어난 동료’ 메달', test: l => medal(l, 'egg') },
  'ball-case': { text: '‘붐비는 PC 박스’ 메달', test: l => medal(l, 'box-30') },
  'long-line': { text: '‘장수’ 메달', test: l => medal(l, 'age-90') },
  'renowned': { text: '‘3대째 트레이너’ 메달', test: l => medal(l, 'generation-3') },
  'town-pass': { text: '삶 2번 완주', test: l => l.totals.lives >= 2 },
  'starter-pick': { text: '누적 동료 종 30종', test: l => l.dex.owned.length >= 30 },
};
export const perkUnlocked = (legacy, id) => Boolean(PERK_UNLOCKS[id]?.test(parseLegacy(legacy)));
export const unlockedPerks = legacy => Object.keys(PERKS).filter(id => perkUnlocked(legacy, id));

/** First-partner choices for the "파트너 선택권" perk: base forms of every non-legendary species the family has owned. */
export function starterChoices(legacy) {
  const l = parseLegacy(legacy);
  return [...new Set(l.dex.owned.filter(id => !LEGENDARY.has(id)).map(evolutionFamily))].filter(id => !LEGENDARY.has(id)).sort((a, b) => a - b);
}

// ── Records room ──
export const RECORDS = [
  { id: 'oldest', label: '최장수', unit: '세', value: l => l.age },
  { id: 'richest', label: '최고 소지금', unit: 'P', value: l => l.peakMoney ?? l.card.money },
  { id: 'titles', label: '최다 리그 타이틀', unit: '개', value: l => l.card.champions.length },
  { id: 'youngest-champion', label: '최연소 챔피언', unit: '세', value: l => l.firstTitleAge, lower: true },
  { id: 'wins', label: '최다 배틀 승리', unit: '승', value: l => l.card.wins },
  { id: 'seen', label: '최다 도감 관측', unit: '종', value: l => l.card.seen },
  { id: 'badges', label: '최다 배지', unit: '개', value: l => l.card.badges },
  { id: 'ribbons', label: '최다 리본', unit: '개', value: l => l.card.ribbons ?? 0 },
  { id: 'symbols', label: '최다 프런티어 심볼', unit: '개', value: l => l.card.symbols ?? 0 },
  { id: 'partner-years', label: '첫 파트너와 가장 오래', unit: '년', value: l => l.partner?.years ?? null },
  { id: 'medals', label: '한 삶 최다 메달', unit: '개', value: l => l.medals.length },
  { id: 'stars', label: '트레이너 카드 별', unit: '개', value: l => l.card.stars.length },
  { id: 'infamy', label: '최고 악명', unit: '', value: l => l.peakInfamy ?? l.card.infamy ?? null },
];

/** The best value of each record across the lives in the hall (ties go to the earlier life). */
export function legacyRecords(legacy) {
  const lives = [...parseLegacy(legacy).lives].reverse();
  return RECORDS.map(r => {
    let best = null;
    for (const life of lives) {
      const v = r.value(life);
      if (v === null || v === undefined || (!r.lower && v <= 0)) continue;
      if (!best || (r.lower ? v < best.value : v > best.value)) best = { value: v, holder: life.name, generation: life.generation, key: life.key };
    }
    return { ...r, value: undefined, best };
  });
}

/** Family lines in the hall: each chain follows a life to the life that inherited its egg. */
export function lineages(legacy) {
  const lives = [...parseLegacy(legacy).lives].reverse(); // oldest first
  const bySeed = new Map(lives.map(l => [l.seed, l]));
  const children = new Map();
  for (const l of lives) if (l.ancestorSeed && bySeed.has(l.ancestorSeed)) (children.get(l.ancestorSeed) || children.set(l.ancestorSeed, []).get(l.ancestorSeed)).push(l);
  const roots = lives.filter(l => !l.ancestorSeed || !bySeed.has(l.ancestorSeed));
  const walk = l => [l, ...(children.get(l.seed) || []).flatMap(walk)];
  return roots.map(walk).filter(chain => chain.length > 1).map(chain => chain.map(l => ({ key: l.key, name: l.name, generation: l.generation, age: l.age, epithet: l.card.epithet, partner: l.partner })));
}

/** How many of each ending-card kind the family has collected (distinct cards and total copies). */
export function cardCollection(legacy) {
  const l = parseLegacy(legacy), out = {};
  for (const [id, count] of Object.entries(l.cards)) {
    const kind = id.split(':')[0];
    out[kind] ||= { distinct: 0, copies: 0 };
    out[kind].distinct += 1; out[kind].copies += count;
  }
  return out;
}
