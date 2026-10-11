// Read-only views of a life for the simulation report: what kinds of events happened, how decisions and checks
// went, a chronicle of the world and the people around the player, and the story of each companion.
// Nothing here changes state; the UI may call these freely.
import { ALL_STORYLETS } from './director.js';
import { DISPOSITIONS } from './party.js';
import { xpLevel } from './battle.js';
import { TOWNS } from '../data/world.js';
import { REGIONS } from '../data/regions.js';

export const CATEGORY_LABELS = {
  league: '리그', contest: '콘테스트', frontier: '배틀 시설', childhood: '유년', career: '경력', stage: '인생 단계', family: '가족',
  pokemon: '포켓몬', work: '일', cast: '인연', world: '세계', opportunity: '기회', romance: '연애', challenge: '도전', route: '장기 경로',
  regional: '지방 이야기', local: '마을', field: '필드', legend: '전설', special: '특별한 만남', plan: '활동 계획', echo: '선택의 여파', milestone: '고정 사건',
  misfortune: '불운', dark: '그늘의 길', prison: '감옥',
};
const CATEGORY_OF = new Map(ALL_STORYLETS.map(st => [st.id, st.category]));
const baseId = id => String(id || '').split('@')[0];

/** The category of a journal entry (storylet category, or echo/milestone for the others). */
export function entryCategory(entry) {
  if (entry.echo) return 'echo';
  return CATEGORY_OF.get(baseId(entry.sourceId)) || (entry.kind === 'milestone' || entry.kind === 'encounter' ? 'milestone' : null);
}

/** Counts of decisions by category, by disposition and the outcome of stat checks. */
export function decisionStats(s) {
  const decisions = s.log.filter(e => e.choices && !e.auto);
  const autos = s.log.filter(e => e.auto && e.resolution);
  const resolved = decisions.filter(e => e.resolution);
  const byCategory = {}, byTone = Object.fromEntries(Object.keys(DISPOSITIONS).map(k => [k, 0]));
  for (const e of decisions) { const c = entryCategory(e) || 'special'; byCategory[c] = (byCategory[c] || 0) + 1; }
  for (const e of resolved) if (e.resolution.tone in byTone) byTone[e.resolution.tone] += 1;
  const checks = resolved.filter(e => e.resolution.check);
  const won = checks.filter(e => e.resolution.check.success);
  const lasting = resolved.filter(e => e.resolution.lasting).length;
  const echoes = s.log.filter(e => e.echo).length;
  const expectedSuccess = checks.length ? Math.round(checks.reduce((n, e) => n + e.resolution.check.chance, 0) / checks.length) : null;
  return {
    decisions: decisions.length, resolved: resolved.length, records: s.log.length, lasting, echoes, autos: autos.length,
    byCategory: Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([id, count]) => ({ id, label: CATEGORY_LABELS[id] || id, count })),
    byTone: Object.entries(byTone).map(([id, count]) => ({ id, label: DISPOSITIONS[id], count })),
    checks: { attempted: checks.length, succeeded: won.length, rate: checks.length ? Math.round(won.length / checks.length * 100) : null, expected: expectedSuccess },
    luckiest: checks.filter(e => e.resolution.check.success).sort((a, b) => a.resolution.check.chance - b.resolution.check.chance)[0] || null,
    unluckiest: checks.filter(e => !e.resolution.check.success).sort((a, b) => b.resolution.check.chance - a.resolution.check.chance)[0] || null,
  };
}

/** Battle totals from the companions' own records. */
export function battleStats(s) {
  const all = [...s.party, ...s.box];
  const battles = all.reduce((n, m) => n + (m.battles || 0), 0), wins = all.reduce((n, m) => n + (m.wins || 0), 0);
  return { battles, wins, rate: battles ? Math.round(wins / battles * 100) : null, catches: s.game.catches, balls: s.game.balls };
}

/** World and people news by age, newest first; optionally only one region (matched by region name in the text). */
export function chronicle(s, { region = 'all', kinds = ['news', 'people', 'echo', 'party'] } = {}) {
  const name = REGIONS.find(r => r.id === region)?.name;
  return s.log.filter(e => (kinds.includes(e.kind) || (kinds.includes('echo') && e.echo)) && (!name || `${e.title} ${e.body}`.includes(name)))
    .map(e => ({ id: e.id, age: e.age, kind: e.echo ? 'echo' : e.kind, title: e.title, body: e.body, town: e.town, entry: e }))
    .reverse();
}

/** Where the life was spent: years per region and per town, from the yearly history. */
export function residence(s) {
  const towns = {}, regions = {};
  for (const row of s.history || []) {
    towns[row.town] = (towns[row.town] || 0) + 1;
    const map = TOWNS.find(t => t.id === row.town)?.map;
    if (map) regions[map] = (regions[map] || 0) + 1;
  }
  return {
    towns: Object.entries(towns).sort((a, b) => b[1] - a[1]).map(([id, years]) => ({ id, name: TOWNS.find(t => t.id === id)?.name, years })),
    regions: Object.entries(regions).sort((a, b) => b[1] - a[1]).map(([id, years]) => ({ id, name: REGIONS.find(r => r.id === id)?.name, years })),
  };
}

/** One companion's story: when and where they met, evolutions, battles, ribbons and journal entries that mention them. */
export function memberStory(s, uid) {
  const m = [...s.party, ...s.box].find(x => x.uid === uid);
  if (!m) return null;
  const ids = new Set([m.id, ...(m.evolutions || []).map(e => e[1])]);
  const mentions = s.log.filter(e => e.age >= m.joined && [...ids].some(id => `${e.body} ${e.resolution?.text || ''}`.includes(`{poke:${id}`))).slice(-12).reverse();
  return {
    member: m, level: xpLevel(m), inParty: s.party.includes(m), years: s.age - m.joined,
    met: TOWNS.find(t => t.id === m.met)?.name || null, evolutions: m.evolutions || [], ribbons: m.ribbons || [],
    battles: m.battles || 0, wins: m.wins || 0, mentions,
  };
}
