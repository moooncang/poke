import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, choose, parseSave } from '../src/engine.js';
import { addPokemon, reorganize, evolveMembers, PARTY_LIMIT } from '../src/sim/party.js';
import { ALL_STORYLETS } from '../src/sim/director.js';
import { present } from './helpers.js';

// A trainer with a partner plus members that differ only in level or affection.
function trainer(disposition) {
  const s = createLife({ seed: 'party', town: 'pallet' });
  s.age = 30;
  s.disposition = { bold: 0, curious: 0, caring: 0, pragmatic: 0, easygoing: 0, ...disposition };
  addPokemon(s, 25, { origin: 'partner', xp: 500, affection: 80 });
  addPokemon(s, 16, { xp: 875, affection: 10 }); // strong but distant (Lv.40)
  addPokemon(s, 16, { xp: 0, affection: 100 }); // weak but devoted (Lv.5)
  for (let i = 0; i < 3; i++) addPokemon(s, 16, { xp: 375, affection: 50 });
  return s;
}

test('a seventh Pokémon sends one member to the PC box and writes a record', () => {
  const s = trainer({ bold: 30 });
  assert.equal(s.party.length, PARTY_LIMIT);
  const { record } = addPokemon(s, 16, { xp: 375 });
  assert.equal(s.party.length, PARTY_LIMIT);
  assert.equal(s.box.length, 1);
  assert.equal(record.kind, 'party');
  assert.ok(s.party.some(m => m.origin === 'partner'), 'the first partner stays');
  assert.equal(s.party[0].origin, 'partner', 'the partner keeps the lead slot');
  assert.ok(parseSave(JSON.stringify(s)));
});

test('the character picks the line-up according to their personality', () => {
  const bold = trainer({ bold: 30 }), caring = trainer({ caring: 30 });
  addPokemon(bold, 16, { xp: 375 });
  addPokemon(caring, 16, { xp: 375 });
  assert.equal(bold.box[0].affection, 100, 'a bold trainer boxes the weakest member');
  assert.equal(caring.box[0].affection, 10, 'a caring trainer boxes the least attached member');
});

test('legendary Pokémon always join the party and are never boxed', () => {
  const s = trainer({ bold: 30 });
  const { member } = addPokemon(s, 150);
  assert.ok(member.locked);
  assert.ok(s.party.includes(member));
  for (let i = 0; i < 8; i++) addPokemon(s, 149, { xp: 2500, affection: 100 });
  reorganize(s);
  assert.ok(s.party.includes(member));
  assert.equal(s.party.length, PARTY_LIMIT);
  assert.equal(s.party.length + s.box.length, 15);
});

test('a yearly review swaps a clearly better boxed member back in', () => {
  const s = trainer({ bold: 30 });
  addPokemon(s, 16, { xp: 375 });
  const boxed = s.box[0];
  boxed.xp = 5000;
  const record = reorganize(s);
  assert.ok(record);
  assert.ok(s.party.includes(boxed));
});

test('capturing a legendary through a decision puts it in the party', () => {
  const legend = ALL_STORYLETS.find(st => st.id === 'legend-encounter');
  let captured = 0;
  for (let rng = 1; rng < 40; rng++) {
    const s = trainer({ bold: 30 });
    s.rng = rng;
    s.stats.courage = 100;
    const event = legend.build(s);
    const after = choose(present(s, event), 0);
    const id = event.encounter.pokemonId;
    if (after.log.at(-1).resolution.check.success) {
      captured++;
      const member = after.party.find(m => m.id === id);
      assert.ok(member?.locked, 'captured legend is locked in the party');
      assert.equal(after.party.length, PARTY_LIMIT);
    } else assert.ok(after.seeds.some(seed => seed.id === 'legend-return') || !after.party.some(m => m.id === id));
  }
  assert.ok(captured > 0);
});

test('members evolve once their level (and affection, if needed) is reached', () => {
  const s = createLife({ seed: 'evolve' });
  addPokemon(s, 1, { xp: 300 });
  addPokemon(s, 133, { xp: 400, affection: 90 });
  const records = evolveMembers(s);
  assert.equal(s.party[0].id, 2);
  assert.ok([134, 135, 136, 196, 197, 470, 471, 700].includes(s.party[1].id));
  assert.equal(records.length, 2);
  assert.ok(s.seen.includes(2));
});
