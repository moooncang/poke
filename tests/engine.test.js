import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, advance, choose, acknowledge, autoChoice, parseSave, toggleMemory, partnerOf } from '../src/engine.js';
import { TOWNS } from '../src/data/world.js';
import { STORYLETS } from '../src/data/storylets.js';
import { play, lifeAt, present } from './helpers.js';

test('same seed and choices produce exactly the same life', () => {
  assert.deepEqual(lifeAt(80, 'shared'), lifeAt(80, 'shared'));
  assert.notDeepEqual(lifeAt(80, 'shared'), lifeAt(80, 'another'));
});

test('first partner at six pauses the simulation, joins and is recorded on that entry', () => {
  const s = lifeAt(6);
  assert.equal(s.encounter.type, 'partner');
  assert.equal(s.party.length, 1);
  assert.equal(s.party[0].origin, 'partner');
  assert.ok(TOWNS[0].pool.includes(s.party[0].id));
  assert.equal(s.log.at(-1).partnerId, s.party[0].id);
  assert.equal(advance(s), s);
  assert.equal(advance(acknowledge(s)).age, 7);
});

test('major NPC is recorded and pauses at ten', () => {
  const s = lifeAt(10);
  assert.equal(s.encounter.npc, 'oak');
  assert.deepEqual(s.people, [{ id: 'oak', age: 10 }]);
  assert.equal(lifeAt(10, 'garden', 'littleroot').encounter.npc, 'steven');
});

test('a career choice changes work, income and does not mutate its input', () => {
  const s = play(createLife({ seed: 'garden', town: 'pallet' }), { until: s => s.pending && s.log.find(e => e.id === s.pending).title === '진로 선택' });
  assert.equal(advance(s), s);
  const chosen = choose(s, 1);
  assert.equal(chosen.career, 'researcher');
  assert.equal(chosen.pending, null);
  assert.equal(chosen.log.find(e => e.id === s.pending).resolution.index, 1);
  assert.equal(chosen.work.years, 0);
  assert.equal(s.career, null, 'input is not mutated');
  const year = play(chosen, { until: x => x.age > s.age });
  assert.ok(year.ledger.income > 0);
});

test('relocation offers move to a different town, charge the cost and keep the hometown', () => {
  const s = lifeAt(25, 'mover');
  const offer = STORYLETS.find(st => st.id === 'relocation-offer').build(structuredClone(s));
  const ready = present(structuredClone(s), offer);
  ready.money = 5000;
  const moved = choose(ready, 0);
  assert.notEqual(moved.town, ready.town);
  assert.equal(moved.hometown, ready.hometown);
  assert.equal(moved.money, 5000 - offer.choices[0].cost);
  assert.ok(moved.visited.includes(moved.town));
  const poor = { ...ready, money: offer.choices[0].cost - 1 };
  assert.equal(choose(poor, 0), poor);
  assert.equal(choose(poor, 2).town, poor.town);
});

test('evolving does not rewrite the partner in earlier memories', () => {
  const s = lifeAt(6), id = partnerOf(s).id;
  const later = lifeAt(60);
  assert.equal(later.log.find(e => e.age === 6 && e.encounter?.type === 'partner').partnerId, id);
});

test('save round-trip preserves unresolved decisions, encounters and the world', () => {
  for (const age of [0, 6, 10, 16, 20, 30, 80]) {
    const s = lifeAt(age);
    const loaded = parseSave(JSON.stringify(s));
    assert.deepEqual(loaded, s);
    assert.deepEqual(advance(loaded), advance(s));
  }
});

test('invalid and incompatible saves are rejected', () => {
  assert.equal(parseSave('bad JSON'), null);
  const base = createLife();
  for (const patch of [{ version: 9 }, { age: 999 }, { town: 'missing' }, { party: [{ id: -1 }] }, { people: [{ id: 'unknown' }] }, { stats: {} }, { pending: 'missing' }, { money: -1 },
    { world: { regions: {}, conditions: [] } }, { seeds: [{ id: 'nope', at: 3, origin: {} }] }, { box: [{ id: 2000 }] }, { reputation: 300 }]) {
    assert.equal(parseSave(JSON.stringify({ ...base, ...patch })), null, JSON.stringify(patch));
  }
});

test('memories can be saved and removed without changing the story', () => {
  const s = lifeAt(9), id = s.log.findLast(e => !s.memories.includes(e.id)).id;
  const saved = toggleMemory(s, id);
  assert.ok(saved.memories.includes(id));
  assert.deepEqual(saved.log, s.log);
  assert.deepEqual(toggleMemory(saved, id), s);
});

test('8 varied complete lifetimes keep valid stats, unique authored events and usable saves', () => {
  const kinds = new Set();
  for (let i = 0; i < 8; i++) {
    let s = createLife({ seed: `long-run-${i}`, town: TOWNS[i * 5 % TOWNS.length].id }), steps = 0;
    while (!s.ended && steps++ < 8000) {
      s = s.encounter ? acknowledge(s) : s.pending ? autoChoice(s) : advance(s);
      for (const value of Object.values(s.stats)) assert.ok(value >= 0 && value <= 100);
      assert.ok(s.party.length <= 6);
    }
    assert.ok(s.age >= 60 && s.age <= 100);
    assert.equal(s.ended, true);
    assert.equal(advance(s), s);
    assert.equal(new Set(s.log.map(e => e.id)).size, s.log.length);
    assert.ok(s.party.length >= 1);
    assert.ok(parseSave(JSON.stringify(s)));
    for (const e of s.log) { if (e.encounter) kinds.add(e.encounter.type); if (e.kind) kinds.add(e.kind); }
    const authored = s.log.map(e => e.sourceId).filter(id => id && !id.includes('@'));
    assert.equal(new Set(authored).size, authored.length, 'one-off events never repeat');
  }
  for (const kind of ['partner', 'npc', 'news', 'people', 'echo', 'choice']) assert.ok(kinds.has(kind), kind);
});
