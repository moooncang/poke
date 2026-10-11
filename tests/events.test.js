import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, choose, parseSave } from '../src/engine.js';
import { MORE_LIFE } from '../src/data/more-life.js';
import { MORE_WORK } from '../src/data/more-work.js';
import { MORE_PLACES } from '../src/data/more-places.js';
import { VIGNETTES as BASE_VIGNETTES } from '../src/data/vignettes.js';
import { VIGNETTES_EXTRA } from '../src/data/vignettes-extra.js';
const VIGNETTES = [...BASE_VIGNETTES, ...VIGNETTES_EXTRA];
import { TOWNS, CAREERS } from '../src/data/world.js';
import { CONDITIONS } from '../src/sim/world.js';
import { addPokemon } from '../src/sim/party.js';
import { POKE_TOKEN } from '../src/sim/text.js';
import { play, present } from './helpers.js';

const cache = {};
const lifeAt = age => cache[age] ||= play(createLife({ seed: 'all-events' }), { until: s => s.age >= age && !s.pending && !s.encounter && !s.scheduledEvent });

// Puts a real life into a state where as many conditions as possible hold (job, marriage, regional conditions…).
function staged(age, townId, career) {
  const s = structuredClone(lifeAt(age));
  Object.assign(s, { town: townId, career, money: 6000, reputation: 50 });
  if (!s.visited.includes(townId)) s.visited.push(townId);
  s.work = { years: 3, satisfaction: 50, cut: 0, retired: false };
  s.relationship = career === 'merchant' ? { ...s.relationship, status: 'single', children: 0 }
    : { ...s.relationship, status: 'married', marriedAt: Math.max(19, s.age - 1), children: 1 };
  s.world.conditions = Object.keys(CONDITIONS).map(id => ({ id, region: TOWNS.find(t => t.id === townId).map, since: s.age, until: s.age + 3 }));
  while (s.party.length < 3) addPokemon(s, 25, { xp: 400 });
  while (s.box.length < 2) addPokemon(s, 16);
  return s;
}

test('every table-driven event can be reached, offers complete choices and keeps saves valid', () => {
  const unreachable = [];
  for (const storylet of [...MORE_LIFE, ...MORE_WORK, ...MORE_PLACES]) {
    let state;
    search: for (const town of TOWNS) for (const career of [null, ...Object.keys(CAREERS)]) for (const age of [Math.max(storylet.min, 6), Math.min(storylet.max, 60)]) {
      const s = staged(age, town.id, career);
      if (!s.ended && (!storylet.when || storylet.when(s))) { state = s; break search; }
    }
    if (!state) { unreachable.push(storylet.id); continue; }
    const event = storylet.build(structuredClone(state));
    assert.doesNotMatch(JSON.stringify(event).replace(POKE_TOKEN, ''), /\{(friend|rival|spouse|sibling|region|villain|pk|partner\|)[^}]*\}|undefined|NaN/, storylet.id);
    event.choices.forEach((choice, i) => {
      assert.ok(choice.label && choice.description && choice.outcome, `${storylet.id}#${i}`);
      const after = choose(present(structuredClone(state), event), i);
      assert.equal(after.pending, null, `${storylet.id}#${i} can be chosen`);
      assert.ok(parseSave(JSON.stringify(after)), `${storylet.id}#${i} keeps the save valid`);
    });
  }
  assert.deepEqual(unreachable, []);
});

test('vignettes have unique ids and only use supported tokens', () => {
  const ids = VIGNETTES.map(v => v.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const v of VIGNETTES) assert.doesNotMatch(v.body, /\{(?!town\}|(partner|friend|spouse|rival|sibling)(\}|\|[^|}]+\|[^}]+\}))[^}]*\}/, v.id);
});

test('every event keeps at least one free option, and a broke player is never stuck', async () => {
  const { ALL_STORYLETS } = await import('../src/sim/director.js');
  const { advance, acknowledge, autoChoice } = await import('../src/engine.js');
  const rich = staged(40, 'pallet', 'keeper');
  for (const storylet of ALL_STORYLETS) {
    if ((storylet.when && !storylet.when(rich)) || rich.age < (storylet.min ?? 0) || rich.age > (storylet.max ?? 120)) continue;
    const event = storylet.build(structuredClone(rich));
    if (event.choices) assert.ok(event.choices.some(c => !c.cost), `${storylet.id} has a free option`);
  }
  let s = createLife({ seed: 'broke' }), steps = 0;
  while (!s.ended && steps++ < 8000) { s.money = 0; s = s.encounter ? acknowledge(s) : s.pending ? autoChoice(s) : advance(s); }
  assert.ok(s.ended, `stuck at ${s.age}`);
});
