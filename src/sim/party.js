// Party of up to six. Extra Pokémon go to the PC box, and the trainer decides on their own who travels with them,
// based on their personality (disposition). Legendary Pokémon always stay in the party.
import { EVOLUTIONS, LEGENDARY } from '../data/species-rules.js';
import { xpLevel, typesOf } from './battle.js';
import { hashSeed, clamp } from './random.js';
import { poke } from './text.js';

export const PARTY_LIMIT = 6;
// The player can keep favourites (pins) or take over the line-up completely (manual mode).
export const PARTY_MODES = { auto: '캐릭터가 편성', manual: '직접 편성' };
export const BOX_TRAINING = 0.25;
export const partyPlan = s => s.partyPlan || { mode: 'auto', pinned: [] };
const isPinned = (s, member) => partyPlan(s).pinned.includes(member.uid);
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

// Greedy team building: legendaries first, then the player's pinned favourites, then the most appealing member.
function pickTeam(s, pool) {
  const legends = pool.filter(m => m.locked).sort((a, b) => b.joined - a.joined || b.uid - a.uid).slice(0, PARTY_LIMIT);
  const pinned = partyPlan(s).pinned.map(uid => pool.find(m => m.uid === uid && !m.locked)).filter(Boolean);
  const team = [...legends, ...pinned].slice(0, PARTY_LIMIT), rest = pool.filter(m => !team.includes(m));
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
  if (partyPlan(s).mode === 'manual') return force ? manualOverflow(s, incoming) : null;
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

// In manual mode the trainer never rearranges the player's line-up: a newcomer waits in the PC box.
// A legendary still has to travel with the trainer, so the least appealing unpinned member makes room instead.
function manualOverflow(s, incoming = s.party.at(-1)) {
  let leaving = incoming;
  if (incoming.locked) {
    const candidates = s.party.filter(m => !m.locked);
    const unpinned = candidates.filter(m => !isPinned(s, m));
    leaving = (unpinned.length ? unpinned : candidates).sort((a, b) => appeal(s, a, []) - appeal(s, b, []) || b.uid - a.uid)[0];
    if (!leaving) return null; // six legendaries: nothing can be boxed.
    s.partyPlan = { ...partyPlan(s), pinned: partyPlan(s).pinned.filter(uid => uid !== leaving.uid) };
  }
  s.party = s.party.filter(m => m !== leaving);
  s.box.push(leaving);
  const body = leaving === incoming
    ? `직접 편성 중이라 새로 합류한 ${poke(incoming.id, '은', '는')} PC 박스에서 기다린다. 파티 관리에서 언제든 데려올 수 있다.`
    : `전설의 포켓몬 ${poke(incoming.id, '이', '가')} 합류해 ${poke(leaving.id, '을', '를')} PC 박스에 맡겼다. 전설의 포켓몬은 언제나 파티에 둔다.`;
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
  // Boxed members keep up a little (PC training), so a favourite brought back later is not hopelessly behind.
  for (const member of s.box) {
    member.xp = (member.xp || 0) + Math.floor(yearlyXp * BOX_TRAINING);
    member.affection = clamp(member.affection - 1, 10, 100);
  }
}

// ── Player party management. Each returns a new state, or the input itself when the action is not allowed. ──
const findMember = (s, uid) => s.party.find(m => m.uid === uid) || s.box.find(m => m.uid === uid) || null;

export function setPartyMode(input, mode) {
  if (!Object.hasOwn(PARTY_MODES, mode) || partyPlan(input).mode === mode) return input;
  const s = structuredClone(input);
  s.partyPlan = { ...partyPlan(s), mode };
  return s;
}

/** Pins a party member so the trainer never boxes it (auto mode). Legendaries are always kept and need no pin. */
export function togglePin(input, uid) {
  const member = input.party.find(m => m.uid === uid);
  if (!member || member.locked) return input;
  const s = structuredClone(input), plan = partyPlan(s);
  s.partyPlan = { ...plan, pinned: plan.pinned.includes(uid) ? plan.pinned.filter(x => x !== uid) : [...plan.pinned, uid] };
  return s;
}

/**
 * Moves a member between party and PC box. Bringing a member into a full party needs `swapUid` (who goes to the box).
 * Members the player brings in are pinned, so the trainer does not undo the player's choice in auto mode.
 */
export function movePokemon(input, uid, swapUid = null) {
  const member = findMember(input, uid);
  if (!member) return input;
  const s = structuredClone(input), plan = partyPlan(s);
  const inParty = s.party.some(m => m.uid === uid);
  if (inParty) {
    const leaving = s.party.find(m => m.uid === uid);
    if (leaving.locked || s.party.length <= 1) return input;
    s.party = s.party.filter(m => m !== leaving);
    s.box.push(leaving);
    s.partyPlan = { ...plan, pinned: plan.pinned.filter(x => x !== uid) };
    return s;
  }
  const joining = s.box.find(m => m.uid === uid);
  let pinned = plan.pinned;
  if (s.party.length >= PARTY_LIMIT) {
    const swap = s.party.find(m => m.uid === swapUid);
    if (!swap || swap.locked) return input;
    s.party = s.party.map(m => m === swap ? joining : m);
    s.box = [...s.box.filter(m => m !== joining), swap];
    pinned = pinned.filter(x => x !== swapUid);
  } else {
    s.party.push(joining);
    s.box = s.box.filter(m => m !== joining);
  }
  if (!pinned.includes(uid)) pinned = [...pinned, uid];
  s.partyPlan = { ...plan, pinned: pinned.slice(-PARTY_LIMIT) };
  return s;
}

/** Puts a party member in the lead slot. The lead is sent out first when its matchup is not clearly worse. */
export function setLead(input, uid) {
  const index = input.party.findIndex(m => m.uid === uid);
  if (index <= 0) return input;
  const s = structuredClone(input);
  const [member] = s.party.splice(index, 1);
  s.party.unshift(member);
  return s;
}
