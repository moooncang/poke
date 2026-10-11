import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife } from '../src/engine.js';
import { addPokemon } from '../src/sim/party.js';
import { selectWildEncounter, evolutionFamily } from '../src/sim/encounters.js';
import { TOWNS } from '../src/data/world.js';

test('evolved and boxed families do not return as new wild captures', () => {
  const s = createLife({ seed: 'fresh-captures', town: 'pallet' });
  for (const id of [18, 20, 26, 45, 134]) addPokemon(s, id);
  addPokemon(s, 149); addPokemon(s, 130);
  const owned = new Set([...s.party, ...s.box].map(p => evolutionFamily(p.id)));
  const before = structuredClone(s);
  const result = selectWildEncounter(s);
  assert.equal(result.observation, false);
  assert.ok(!owned.has(evolutionFamily(result.id)));
  assert.equal(result.habitat.map, 'kanto');
  assert.deepEqual(result, selectWildEncounter(before), 'saved RNG reproduces encounter');
});

test('long collection expands beyond the local pool without duplicate families', () => {
  const s = createLife({ seed: 'collect', town: 'pallet' });
  const families = new Set();
  for (let i = 0; i < 65; i++) {
    const result = selectWildEncounter(s);
    assert.equal(result.observation, false);
    const family = evolutionFamily(result.id);
    assert.ok(!families.has(family)); families.add(family);
    addPokemon(s, result.id);
  }
  assert.equal(families.size, 65);
});

test('fully collected habitats offer observation rather than repeat captures', () => {
  const s = createLife({ seed: 'complete', town: 'pallet' });
  s.box = [...new Set(TOWNS.flatMap(t => t.pool))].map(id => ({ id }));
  assert.equal(selectWildEncounter(s).observation, true);
});
