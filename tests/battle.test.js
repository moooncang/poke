import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createLife } from '../src/engine.js';
import { autoBattle, typeMultiplier, MEGA, GMAX_FORMS } from '../src/sim/battle.js';
import { addPokemon } from '../src/sim/party.js';
import { TOWNS } from '../src/data/world.js';
import { REGIONS } from '../src/data/regions.js';
import { REGIONAL_EVENTS } from '../src/data/regional-stories.js';

function ready(id = 6, xp = 1500) {
  const s = createLife({ seed: 'battle', town: 'pallet' });
  s.age = 20;
  addPokemon(s, id, { origin: 'partner', xp });
  return s;
}

test('nine regions have starter species, forty towns, local story chains and form assets', () => {
  assert.equal(REGIONS.length, 9);
  assert.equal(TOWNS.length, 40);
  for (const r of REGIONS) { assert.ok(TOWNS.some(t => t.map === r.id)); assert.equal(REGIONAL_EVENTS.filter(e => e.region === r.id).length, 3); assert.ok(r.villain); }
  for (const id of [...Object.values(MEGA), ...Object.values(GMAX_FORMS)]) assert.ok(existsSync(`public/assets/pokemon/forms/${id}.png`));
});

test('type chart includes immunities, resistances and dual type multiplication', () => {
  assert.equal(typeMultiplier('전기', ['땅']), 0);
  assert.equal(typeMultiplier('불꽃', ['풀', '강철']), 4);
  assert.equal(typeMultiplier('물', ['물']), 0.5);
  assert.equal(typeMultiplier('격투', ['고스트']), 0);
});

test('the trainer leads with the best matchup and wins a gym badge with rewards', () => {
  const s = ready(6, 200);
  addPokemon(s, 9, { xp: 1500 });
  const money = s.money;
  const result = autoBattle(s, { kind: 'gym', opponentId: 27, regionId: 'kanto' });
  assert.equal(result.lead.id, 9, 'water beats ground');
  assert.equal(result.result, 'win');
  assert.equal(s.game.badges.kanto, 1);
  assert.equal(s.money, money + 500);
});

test('capture battles hold back and use balls instead of knocking the target out', () => {
  let caught = 0;
  for (let rng = 1; rng < 20; rng++) {
    const s = ready(); s.rng = rng;
    const balls = s.game.balls;
    const result = autoBattle(s, { kind: 'wild', opponentId: 16, regionId: 'kanto', allowCapture: true });
    assert.notEqual(result.result, 'win');
    if (result.result === 'caught') { caught++; assert.equal(result.captured, 16); assert.ok(s.game.balls < balls); }
  }
  assert.ok(caught > 15);
});

test('gear is used automatically when its conditions are met', () => {
  const mega = ready(6); mega.game.gear = ['mega']; mega.game.megaStones = [6];
  assert.equal(autoBattle(mega, { kind: 'wild', opponentId: 16, regionId: 'kanto' }).transformation, 'mega');
  const galar = ready(6); galar.game.gear = ['dynamax'];
  assert.equal(autoBattle(galar, { kind: 'wild', opponentId: 16, regionId: 'galar' }).transformation, null, 'no dynamax in the wild');
  assert.equal(autoBattle(structuredClone(galar), { kind: 'gym', opponentId: 16, regionId: 'galar' }).transformation, 'dynamax');
  galar.game.gmax = [6];
  assert.equal(autoBattle(galar, { kind: 'raid', opponentId: 16, regionId: 'galar' }).transformation, 'gmax');
  const tera = ready(25); tera.game.gear = ['tera'];
  const result = autoBattle(tera, { kind: 'wild', opponentId: 7, regionId: 'paldea' });
  assert.equal(result.transformation, 'tera');
  assert.equal(tera.game.teraType, '전기');
});

test('a raid win registers the Gigantamax factor', () => {
  const s = ready(6, 3000); s.game.gear = ['dynamax'];
  const result = autoBattle(s, { kind: 'raid', opponentId: 143, regionId: 'galar' });
  assert.equal(result.result, 'win');
  assert.ok(s.game.gmax.includes(143));
});
