// Player feedback round: legendary inheritance, romance preference, famous-trainer ties, wedding timing, prison
// as a chapter rather than a reset, the talent route at 16 as a real career, visible type matchups, legendary levels.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, parseSave, choose, advance, setGender, legendLevel, VERSION, ROMANCE } from '../src/engine.js';
import { heritageFor, heirCandidates, validHeritage } from '../src/sim/legacy.js';
import { LEGACY_EVENTS } from '../src/data/legacy-events.js';
import { NPC_TIES } from '../src/data/npc-ties.js';
import { addPokemon } from '../src/sim/party.js';
import { autoBattle, battleSummary, xpLevel } from '../src/sim/battle.js';
import { tickStanding, PRISON_MAX } from '../src/sim/standing.js';
import { tickPeople } from '../src/sim/people.js';
import { careerReview } from '../src/data/progression.js';
import { talentPathChoice } from '../src/data/talent-events.js';
import { MOVES, moveFor } from '../src/data/moves.js';
import { play, present } from './helpers.js';

const grown = (seed, age = 24) => { const s = createLife({ seed }); s.age = age; addPokemon(s, 6, { origin: 'partner', xp: 1000 }); return s; };

test('a legendary joins at the trainer\'s level, never as a hatchling', () => {
  const s = grown('legend-level');
  assert.ok(legendLevel(s) >= 30 && legendLevel(s) <= 80);
  const joined = choose({ ...s, pending: 'x', log: [...s.log, { id: 'x', title: 't', body: '', kind: 'choice', choices: [{ label: 'a', description: '', outcome: '', effects: {}, join: 150, joinOrigin: 'legend' }] }] }, 0);
  const mewtwo = joined.party.find(m => m.id === 150);
  assert.ok(mewtwo && mewtwo.locked, 'legendary joined and is locked');
  assert.ok(xpLevel(mewtwo) >= 30, `level ${xpLevel(mewtwo)}`);
  assert.ok(xpLevel(mewtwo) >= xpLevel(s.party[0]) - 1);
});

test('the closest legendary follows the bloodline and finds the heir', () => {
  const s = grown('heir-legend', 40);
  addPokemon(s, 144, { origin: 'legend', affection: 80 }); s.party.find(m => m.id === 144).locked = true;
  addPokemon(s, 25, { xp: 300 });
  const h = heritageFor(s, heirCandidates(s)[0].uid);
  assert.equal(h.legend.id, 144);
  assert.ok(validHeritage(h));
  assert.ok(!heirCandidates(s).some(c => c.egg === 144), 'the legendary itself leaves no egg');
  const heir = createLife({ seed: 'heir-life', heritage: h });
  heir.age = 20; addPokemon(heir, h.egg, { origin: 'partner', xp: 800 });
  const event = LEGACY_EVENTS.find(e => e.id === 'heritage-legend');
  assert.ok(event.when(heir));
  const built = event.build(heir);
  assert.ok(built.choices.filter(c => c.join === 144 && c.joinOrigin === 'legend').length === 2);
  const after = choose(present(heir, built), 0);
  if (after.party.some(m => m.id === 144)) { assert.ok(after.party.find(m => m.id === 144).locked); assert.ok(!event.when(after)); }
  else assert.ok(event.when({ ...after, cooldowns: {} }), 'a failed meeting leaves the event open for a return');
  assert.ok(parseSave(JSON.stringify(after)));
});

test('romance preference picks the partner\'s gender and name; changing gender re-draws an unstarted partner', () => {
  assert.deepEqual(Object.keys(ROMANCE), ['opposite', 'any', 'same']);
  for (const seed of ['r1', 'r2', 'r3']) {
    assert.equal(createLife({ seed, gender: 'male' }).relationship.gender, 'female');
    assert.equal(createLife({ seed, gender: 'female', romance: 'opposite' }).relationship.gender, 'male');
    assert.equal(createLife({ seed, gender: 'female', romance: 'same' }).relationship.gender, 'female');
  }
  const any = new Set(['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'].map(seed => createLife({ seed, gender: 'male', romance: 'any' }).relationship.gender));
  assert.equal(any.size, 2, 'any draws both genders');
  const s = createLife({ seed: 'swap', gender: 'male' });
  const t = setGender(s, 'female');
  assert.equal(t.relationship.gender, 'male');
  assert.equal(s.relationship.gender, 'female', 'input untouched');
  const dating = { ...s, relationship: { ...s.relationship, status: 'dating', chapter: 3 } };
  assert.equal(setGender(dating, 'female').relationship.name, dating.relationship.name, 'a started romance keeps its partner');
  assert.equal(createLife({ seed: 'x', romance: 'nope' }).romance, 'opposite');
  assert.equal(parseSave(JSON.stringify({ ...s, romance: 'nope' })), null);
  const v7 = structuredClone(s); v7.version = 7; delete v7.romance; v7.relationship = { name: '지호', status: 'single', chapter: 0, trust: 20, children: 0 };
  const migrated = parseSave(JSON.stringify(v7));
  assert.equal(migrated.version, VERSION); assert.equal(migrated.romance, 'opposite'); assert.equal(migrated.relationship.gender, 'male');
});

test('famous trainers keep turning up after the first meeting; Steven leads to a key stone', () => {
  assert.ok(NPC_TIES.length >= 16);
  const s = grown('npc', 20);
  assert.ok(!NPC_TIES.some(e => e.when(s)), 'nothing opens before any meeting');
  s.people = [{ id: 'steven', age: 10 }];
  const letter = NPC_TIES.find(e => e.id === 'npc-steven-letter');
  assert.ok(letter.when(s));
  let after = choose(present(s, letter.build(s)), 0);
  assert.ok(after.flags['npc-steven-stone']);
  const stone = NPC_TIES.find(e => e.id === 'npc-steven-keystone');
  assert.ok(stone.when(after));
  after.stats.bond = 90;
  after = choose(present(after, stone.build(after)), 0);
  assert.ok(after.game.gear.includes('mega'), 'key stone received');
  assert.ok(!stone.when(after));
  const oak = NPC_TIES.find(e => e.id === 'npc-oak-evaluation');
  after.people.push({ id: 'oak', age: 12 }); after.seen = Array.from({ length: 160 }, (_, i) => i + 1);
  const paid = choose(present(after, oak.build(after)), 0);
  assert.ok(paid.money > after.money, 'the Pokédex pays');
  assert.ok(parseSave(JSON.stringify(paid)));
});

test('a childhood friend\'s wedding invitation only comes in the wedding year, and only before 50', async () => {
  const s = createLife({ seed: 'wed' }); s.age = 72; s.cast.friend.married = true; s.cast.friend.wedding = false;
  for (let r = 0; r < 200; r++) { s.rng = r * 7919 + 1; tickPeople(s); }
  assert.equal(s.cast.friend.wedding, false, 'no wedding after 45');
  const { VIGNETTES_EXTRA } = await import('../src/data/vignettes-extra.js');
  const invite = VIGNETTES_EXTRA.find(v => v.id === 'vx-ties-friend-invite');
  assert.equal(invite.max, 50);
  assert.ok(!invite.when(s), 'married long ago: no invitation');
  s.age = 30; s.cast.friend.wedding = true; assert.ok(invite.when(s));
});

test('prison is a chapter, not a reset: shorter terms, parole for model inmates, the old rank waits', () => {
  const sentence = infamy => { const s = createLife({ seed: 'jail' }); s.age = 30; s.infamy = infamy; s.career = 'syndicate'; s.careerRank = 3; s.rng = 11;
    let years = 0; for (let r = 1; r <= 80 && !years; r++) { const t = structuredClone(s); t.rng = r * 104729; if (tickStanding(t).some(x => x.title === '체포')) { years = t.prison; assert.equal(t.flags['syndicate-rank'], 3); } } return years; };
  assert.ok(sentence(60) <= 4 && sentence(100) <= 6, `${sentence(60)} / ${sentence(100)}`);
  let paroled = 0;
  for (let r = 1; r <= 40; r++) { const s = createLife({ seed: 'parole' }); s.age = 30; s.prison = 4; s.flags['route-model-inmate'] = true; s.rng = r * 7919; tickStanding(s); if (s.prison === 2) paroled++; }
  assert.ok(paroled > 5 && paroled < 35, `parole ${paroled}/40`);
  const back = createLife({ seed: 'rejoin' }); back.age = 32; back.flags['syndicate-rank'] = 4; back.flags['route-old-contact'] = true;
  const rejoined = choose({ ...back, pending: 'x', log: [...back.log, { id: 'x', title: 't', body: '', kind: 'choice', choices: [{ label: 'a', description: '', outcome: '', effects: {}, career: 'syndicate' }] }] }, 0);
  assert.equal(rejoined.careerRank, 4); assert.equal(rejoined.flags['syndicate-rank'], undefined);
  const half = choose({ ...back, flags: { 'syndicate-rank': 4 }, pending: 'x', log: [...back.log, { id: 'x', title: 't', body: '', kind: 'choice', choices: [{ label: 'a', description: '', outcome: '', effects: {}, career: 'syndicate' }] }] }, 0);
  assert.equal(half.careerRank, 2);
});

test('at 16 the talent route is a real career; later it only sets the way of learning', () => {
  const s = createLife({ seed: 'talent16' }); s.age = 16; s.talent = { field: 'research', level: 4 };
  const review = careerReview(s, 16);
  const route = review.choices.find(c => c.label.includes('탐구 지능'));
  assert.ok(route, 'talent route offered at 16');
  assert.equal(route.career, 'researcher');
  assert.equal(talentPathChoice(s).career, undefined);
  const chosen = choose(present(s, review), review.choices.indexOf(route));
  assert.ok(['researcher', null].includes(chosen.career));
  if (chosen.career === 'researcher') assert.equal(chosen.education, 'study');
});

test('battle records name the move, its type and how well it worked', () => {
  assert.equal(Object.keys(MOVES).length, 18);
  assert.equal(moveFor('불꽃', 10), '불꽃세례'); assert.equal(moveFor('불꽃', 60), '오버히트');
  const s = grown('moves');
  const r = autoBattle(s, { kind: 'wild', opponentId: 1, regionId: 'kanto' });
  assert.equal(r.attack.type, '불꽃'); assert.equal(r.attack.multiplier, 2);
  const text = battleSummary(r, id => `#${id}`);
  assert.match(text, /화염방사\(불꽃\) · 효과가 굉장했다/);
  assert.match(text, /상대 풀 기술은 잘 통하지 않았다/);
  addPokemon(s, 7, { xp: 1200 });
  const swapped = autoBattle(s, { kind: 'wild', opponentId: 74, regionId: 'kanto' });
  assert.ok(swapped.swapped && swapped.lead.id === 7);
  assert.match(battleSummary(swapped, id => `#${id}`), /상성을 보고 선두로 바꿨다/);
});
