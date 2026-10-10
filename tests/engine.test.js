import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, advance, choose, acknowledge, autoChoice, parseSave, toggleMemory, partnerOf } from '../src/engine.js';
import { TOWNS } from '../src/data/world.js';

function toAge(age, seed = 'garden', town = 'pallet', path = 0) {
  let s = createLife({ seed, town });
  while (s.age < age) {
    s = s.encounter ? acknowledge(s) : s.pending ? choose(s, path) : advance(s);
  }
  return s;
}

test('same seed and choices produce exactly the same life', () => {
  assert.deepEqual(toAge(80, 'shared'), toAge(80, 'shared'));
  assert.notDeepEqual(toAge(80, 'shared'), toAge(80, 'another'));
});

test('first partner at six pauses the simulation and joins the household', () => {
  const s = toAge(6);
  assert.equal(s.encounter.type, 'partner');
  assert.equal(s.party.length, 1);
  assert.ok(TOWNS[0].pool.includes(s.party[0].id));
  assert.ok(s.seen.includes(s.party[0].id));
  assert.equal(advance(s), s);
  assert.equal(advance(acknowledge(s)).age, 7);
});

test('major NPC is recorded and pauses at ten', () => {
  const s = toAge(10);
  assert.equal(s.encounter.npc, 'oak');
  assert.deepEqual(s.people, [{ id: 'oak', age: 10 }]);
  assert.equal(toAge(10, 'garden', 'littleroot').encounter.npc, 'steven');
});

test('a career choice changes subsequent work, income and story', () => {
  const s = toAge(16);
  assert.ok(s.pending);
  assert.equal(advance(s), s);
  const chosen = choose(s, 1);
  assert.equal(chosen.career, 'researcher');
  assert.equal(chosen.pending, null);
  assert.equal(chosen.log.at(-1).resolution.index, 1);
  assert.equal(s.career, null, 'input is not mutated');
  assert.ok(advance(chosen).money >= chosen.money + 200);
});

test('moving spends the declared amount and preserves hometown', () => {
  const s = toAge(20);
  const moved = choose(s, 0);
  assert.notEqual(moved.town, s.town);
  assert.equal(moved.hometown, s.hometown);
  assert.equal(moved.money, s.money - 600);
  assert.equal(moved.visited.length, 2);
  const poor = { ...s, money: 599 };
  assert.equal(choose(poor, 0), poor);
  assert.equal(choose(poor, 1).town, poor.town);
});

test('evolving does not rewrite the partner in earlier memories', () => {
  const s = toAge(6);
  const id = partnerOf(s).id;
  const later = toAge(40);
  assert.equal(later.log.find(e => e.age === 6).partnerId, id);
  if (later.flags.evolved) assert.notEqual(partnerOf(later).id, id);
});

test('a legendary meeting is remembered without automatically capturing it', () => {
  let found;
  for (let i = 0; i < 50 && !found; i++) {
    const s = toAge(80, `legend-${i}`);
    const e = s.log.find(e => e.encounter?.type === 'legendary');
    if (e) found = { s, e };
  }
  assert.ok(found);
  assert.ok(found.s.memories.includes(found.e.id));
  assert.ok(found.s.seen.includes(found.e.encounter.pokemonId));
  assert.ok(!found.s.party.some(p => p.id === found.e.encounter.pokemonId));
});

test('save round-trip preserves unresolved decisions and encounters', () => {
  for (const age of [0, 6, 10, 16, 20, 30, 80]) {
    const s = toAge(age);
    const loaded = parseSave(JSON.stringify(s));
    assert.deepEqual(loaded, s);
    assert.deepEqual(advance(loaded), advance(s));
  }
});

test('invalid and incompatible saves are rejected', () => {
  assert.equal(parseSave('bad JSON'), null);
  for (const patch of [{version: 9}, {age: 999}, {town: 'missing'}, {party: [{id: -1}]}, {people: [{id: 'unknown'}]}, {stats: {}}, {pending: 'missing'}, {money: -1}]) {
    assert.equal(parseSave(JSON.stringify({...createLife(), ...patch})), null);
  }
});

test('memories can be saved and removed without changing the story', () => {
  const s = toAge(3), id = s.log.at(-1).id;
  const saved = toggleMemory(s, id);
  assert.ok(saved.memories.includes(id));
  assert.deepEqual(saved.log, s.log);
  assert.deepEqual(toggleMemory(saved, id), s);
});

test('150 varied complete lifetimes keep valid stats, unique events and usable saves', () => {
  const kinds = new Set();
  for (let i = 0; i < 150; i++) {
    let s = createLife({ seed: `long-run-${i}`, town: TOWNS[i % TOWNS.length].id });
    let iterations = 0;
    while (!s.ended && iterations++ < 200) {
      s = s.encounter ? acknowledge(s) : s.pending ? autoChoice(s) : advance(s);
      for (const value of Object.values(s.stats)) assert.ok(value >= 0 && value <= 100);
    }
    assert.equal(s.age, 80);
    assert.equal(s.ended, true);
    assert.equal(s.log.length, 81);
    assert.equal(advance(s), s);
    assert.equal(new Set(s.log.map(e => e.id)).size, 81);
    assert.ok(s.party.length >= 1 && s.party.length <= 4);
    assert.ok(parseSave(JSON.stringify(s)));
    for (const e of s.log) if (e.encounter) kinds.add(e.encounter.type);
    const sources = s.log.map(e => e.sourceId).filter(Boolean);
    assert.equal(new Set(sources).size, sources.length, 'authored events should not repeat');
  }
  assert.deepEqual([...kinds].sort(), ['evolution', 'legendary', 'npc', 'partner', 'shiny']);
});
