import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSave, choose, VERSION } from '../src/engine.js';
import { play } from './helpers.js';

const legacy = readFileSync(new URL('./fixtures/v1-save.json', import.meta.url), 'utf8');

test('a version 1 save migrates without losing the story or the pending decision', () => {
  const old = JSON.parse(legacy), s = parseSave(legacy);
  assert.ok(s);
  assert.equal(s.version, VERSION);
  assert.equal(s.pending, old.pending);
  assert.deepEqual(s.log, old.log);
  assert.equal(s.rng, old.rng);
  assert.equal(s.party.length, old.party.length);
  assert.ok(s.party.every(m => m.uid && m.affection >= 0));
  assert.equal(s.party[0].origin, 'partner');
  assert.deepEqual(s.box, []);
  assert.ok(s.world.regions.kanto && s.cast.friend.name);
  assert.equal(s.game.position, undefined);
  assert.equal(s.gender, old.gender);
  assert.deepEqual(parseSave(legacy), s, 'migration is deterministic');
});

test('a migrated save keeps playing to the end', () => {
  const s = play(choose(parseSave(legacy), 0));
  assert.ok(s.ended);
  assert.ok(parseSave(JSON.stringify(s)));
});

test('malformed version 1 data is still rejected', () => {
  const old = JSON.parse(legacy);
  for (const patch of [{ town: 'nowhere' }, { party: [{ id: 5000, joined: 0, shiny: false }] }, { pending: 'missing' }]) assert.equal(parseSave(JSON.stringify({ ...old, ...patch })), null);
});
