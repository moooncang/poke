// Party of up to six. Extra Pokémon go to the PC box, and the trainer decides on their own who travels with them,
// based on their personality (disposition). Legendary Pokémon always stay in the party.
import { EVOLUTIONS, LEGENDARY } from '../data/species-rules.js';
import { xpLevel, typesOf } from './battle.js';
import { hashSeed, clamp } from './random.js';
import { poke } from './text.js';

export const PARTY_LIMIT = 6;
export const isLegendary = id => LEGENDARY.has(id);
export const partnerOf = s => s.party.find(p => p.origin === 'partner') || s.party[0] || null;

export const DISPOSITIONS = { bold: '대담', curious: '탐구', caring: '배려', pragmatic: '실리', easygoing: '여유' };
export const dominantDisposition = s => Object.entries(s.disposition || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || 'easygoing';

const REASONS = {
  bold: '강한 포켓몬과 함께 더 높은 곳에 도전하고 싶었다',
  curious: '여러 타입을 고루 데려가 새로운 것을 보고 싶었다',
  caring: '오래 함께하며 정이 든 포켓몬을 곁에 두고 싶었다',
  pragmatic: '지금 하는 일에 가장 쓸모 있는 구성을 택했다',
  easygoing: '오래 함께한 친구들과 느긋하게 다니고 싶었다',
};

function makeMember(s, id, { shiny = false, xp = 0, origin = 'wild', affection = 35 } = {}) {
  s.nextUid = (s.nextUid || 0) + 1;
  return { uid: s.nextUid, id, joined: s.age, shiny, xp, affection, origin, ...(isLegendary(id) ? { locked: true } : {}) };
}

function seen(s, id) { if (!s.seen.includes(id)) s.seen.push(id); }

// How much the trainer wants this member, given the members already picked.
function appeal(s, member, picked) {
  const d = s.disposition || {};
  const covered = new Set(picked.flatMap(p => typesOf(p.id)));
  const freshTypes = typesOf(member.id).filter(t => !covered.has(t)).length;
  const years = Math.min(30, s.age - member.joined);
  const careerFit = s.career === 'traveler' ? xpLevel(member) * 0.4 : s.career === 'keeper' ? member.affection * 0.2
    : s.career === 'researcher' ? freshTypes * 4 : 0;
  return xpLevel(member) * (1 + (d.bold || 0) * 0.04 + (d.pragmatic || 0) * 0.02)
    + member.affection * (0.25 + (d.caring || 0) * 0.03)
    + freshTypes * (5 + (d.curious || 0) * 0.8)
    + years * (d.easygoing || 0) * 0.15
    + (member.shiny ? 8 : 0) + (member.origin === 'partner' ? 60 : 0) + careerFit;
}

// Greedy team building: legendaries first, then the most appealing member given current type coverage.
function pickTeam(s, pool) {
  const legends = pool.filter(m => m.locked).sort((a, b) => b.joined - a.joined || b.uid - a.uid).slice(0, PARTY_LIMIT);
  const team = [...legends], rest = pool.filter(m => !legends.includes(m));
  while (team.length < PARTY_LIMIT && rest.length) {
    rest.sort((a, b) => appeal(s, b, team) - appeal(s, a, team) || a.uid - b.uid);
    team.push(rest.shift());
  }
  return team;
}
const teamValue = (s, team) => team.reduce((sum, m, i) => sum + appeal(s, m, team.slice(0, i)), 0);

/**
 * Re-forms the party from party + box. Forced when the party is over the limit; otherwise the trainer only swaps
 * when the new line-up is clearly better. Returns a journal record when the line-up changed.
 */
export function reorganize(s, { force = s.party.length > PARTY_LIMIT, incoming } = {}) {
  const pool = [...s.party, ...s.box];
  const team = pickTeam(s, pool);
  const same = team.length === s.party.length && team.every(m => s.party.includes(m));
  if (same || (!force && teamValue(s, team) - teamValue(s, s.party) < 15)) return null;
  const left = s.party.filter(m => !team.includes(m)), joined = team.filter(m => !s.party.includes(m));
  // Keep the existing order so the partner stays in front.
  s.party = [...s.party.filter(m => team.includes(m)), ...joined];
  s.box = pool.filter(m => !team.includes(m));
  const name = m => `${poke(m.id)}(Lv.${xpLevel(m)})`;
  const forced = force && incoming;
  const body = `${forced ? `${poke(incoming.id, '의', '의')} 합류로 파티가 6마리를 넘었다. ` : ''}${REASONS[dominantDisposition(s)]}. `
    + `${joined.length ? `파티로 데려온 포켓몬: ${joined.map(name).join(', ')}. ` : ''}박스에 맡긴 포켓몬: ${left.map(name).join(', ')}.`
    + `${team.some(m => m.locked) ? ' 전설의 포켓몬은 언제나 파티에 둔다.' : ''}`;
  return { kind: 'party', automatic: true, title: '파티 재편성', body, effects: {} };
}

/** Adds a Pokémon. Legendaries are locked to the party; any overflow triggers an autonomous reorganisation. */
export function addPokemon(s, id, options) {
  const member = makeMember(s, id, options);
  seen(s, id);
  s.party.push(member);
  const record = s.party.length > PARTY_LIMIT ? reorganize(s, { force: true, incoming: member }) : null;
  return { member, record };
}

/** Evolves members whose level (and affection, if required) meets a rule. Returns evolution records. */
export function evolveMembers(s, members = s.party) {
  const records = [];
  for (const member of members) {
    const ready = (EVOLUTIONS[member.id] || []).filter(([, level, needsAffection]) => xpLevel(member) >= level && (!needsAffection || member.affection >= 70));
    if (!ready.length) continue;
    const [target] = ready[hashSeed(`${s.seed}-${member.uid}-evolve`) % ready.length];
    records.push({ kind: 'party', automatic: true, title: '진화', body: `${poke(member.id, '이', '가')} ${poke(target, '으로', '로')} 진화했다. (Lv.${xpLevel(member)})`, effects: {}, from: member.id, to: target, partner: member.origin === 'partner' });
    member.id = target;
    seen(s, target);
  }
  return records;
}

export function trainParty(s, xp) {
  for (const member of s.party) member.xp = (member.xp || 0) + xp;
}

/** Yearly growth: party members gain experience and affection; boxed members slowly drift apart. */
export function growParty(s, yearlyXp) {
  const caring = s.disposition?.caring || 0;
  for (const member of s.party) {
    member.xp = (member.xp || 0) + yearlyXp;
    member.affection = clamp(Math.round(member.affection + 2 + caring * 0.1 + s.stats.bond / 50), 0, 100);
  }
  for (const member of s.box) member.affection = clamp(member.affection - 1, 10, 100);
}
