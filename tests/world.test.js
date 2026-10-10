import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, advance, choose, parseSave } from '../src/engine.js';
import { tickWorld, currentRegion, hasCondition, WORLD_KEYS } from '../src/sim/world.js';
import { tickPeople } from '../src/sim/people.js';
import { directEvent, ALL_STORYLETS } from '../src/sim/director.js';
import { CONSEQUENCES } from '../src/data/consequences.js';
import { REGIONS } from '../src/data/regions.js';
import { lifeAt, present, play } from './helpers.js';

test('regions drift, gain and lose conditions and stay within bounds', () => {
  const s = createLife({ seed: 'world' });
  const seen = new Set(), records = [];
  for (let age = 1; age <= 60; age++) {
    s.age = age;
    records.push(...tickWorld(s));
    for (const c of s.world.conditions) seen.add(c.id);
    for (const r of REGIONS) for (const key of Object.keys(WORLD_KEYS)) assert.ok(s.world.regions[r.id][key] >= 0 && s.world.regions[r.id][key] <= 100);
    assert.ok(s.world.conditions.every(c => c.until >= age));
  }
  assert.ok(seen.size >= 6, `condition variety: ${[...seen]}`);
  assert.ok(records.some(r => r.kind === 'news'));
});

test('the regional economy changes yearly income', () => {
  const base = lifeAt(30, 'economy');
  const s = play(base, { until: x => !x.pending && !x.encounter && !x.scheduledEvent });
  s.career = 'merchant'; s.work.retired = false; s.work.cut = 0;
  const poor = structuredClone(s), rich = structuredClone(s);
  poor.world.regions[currentRegion(s)].economy = 5;
  rich.world.regions[currentRegion(s)].economy = 95;
  assert.ok(advance(rich).ledger.income > advance(poor).ledger.income * 1.5);
});

test('conditions in the current region unlock their own events', () => {
  const s = lifeAt(30, 'syndicate');
  const settled = play(s, { until: x => !x.pending && !x.encounter && !x.scheduledEvent });
  const count = withCondition => {
    let hits = 0;
    for (let rng = 1; rng <= 150; rng++) {
      const t = structuredClone(settled);
      t.rng = rng;
      t.world.conditions = withCondition ? [{ id: 'syndicate', region: currentRegion(t), since: t.age, until: t.age + 3 }] : [];
      if (directEvent(t)?.id?.startsWith('syndicate-raid')) hits++;
    }
    return hits;
  };
  assert.equal(count(false), 0);
  assert.ok(count(true) > 10);
});

test("a choice's world effects shift the current region", () => {
  const s = lifeAt(30, 'shift');
  const settled = play(s, { until: x => !x.pending && !x.encounter && !x.scheduledEvent });
  settled.world.conditions = [{ id: 'boom', region: currentRegion(settled), since: settled.age, until: settled.age + 3 }];
  const event = ALL_STORYLETS.find(st => st.id === 'boom-offer').build(structuredClone(settled));
  const ready = present(structuredClone(settled), event);
  const before = ready.world.regions[currentRegion(ready)].ecology;
  const after = choose(ready, 1);
  assert.equal(after.world.regions[currentRegion(after)].ecology, Math.min(100, before + 8));
});

test('people around the player live their own lives', () => {
  const s = createLife({ seed: 'people' });
  s.cast.rival.met = true; s.cast.rival.path = 'trainer';
  const paths = new Set();
  for (let age = 1; age <= 70; age++) { s.age = age; tickPeople(s); paths.add(s.cast.friend.path); }
  assert.ok(paths.size >= 3, [...paths].join());
  assert.ok(s.cast.rival.power > 15);
  assert.ok(s.cast.family.health < 75 || s.cast.family.sick);
});

test('every storylet builds a valid event in many real states', () => {
  const states = [];
  for (const seed of ['states-a', 'states-b', 'states-c']) {
    let s = createLife({ seed });
    for (let age = 5; age <= 75; age += 5) { s = play(s, { until: x => x.age >= age }); if (s.ended) break; states.push(s); }
  }
  let built = 0;
  const checked = new Set();
  for (const state of states) for (const storylet of ALL_STORYLETS) {
    const s = structuredClone(state);
    if (s.age < (storylet.min ?? 0) || s.age > (storylet.max ?? 120) || (storylet.when && !storylet.when(s))) continue;
    const event = storylet.build(s);
    built++;
    assert.ok(event.title && event.body, storylet.id);
    for (const choice of event.choices || []) {
      assert.ok(choice.label && choice.description && choice.outcome, `${storylet.id}: ${choice.label}`);
      for (const follow of [...(choice.follow || []), ...(choice.challenge?.failure?.follow || []), ...Object.values(choice.after || {}).flatMap(a => a.follow || [])])
        assert.ok(CONSEQUENCES[follow.id], `${storylet.id} → ${follow.id}`);
    }
    // Resolving every choice once per storylet keeps the save valid (checked on the first state that offers it).
    if (!event.choices || checked.has(storylet.id)) continue;
    checked.add(storylet.id);
    const ready = present(structuredClone(state), { ...event, kind: 'choice' });
    for (let i = 0; i < event.choices.length; i++) {
      const after = choose(ready, i);
      if (after !== ready) assert.ok(parseSave(JSON.stringify(after)), `${storylet.id} choice ${i} keeps the save valid`);
    }
  }
  assert.ok(built > 300);
});

test('urgent family events take precedence when they become possible', () => {
  const s = play(lifeAt(40, 'family'), { until: x => !x.pending && !x.encounter && !x.scheduledEvent });
  s.cast.family.health = 0;
  s.cast.family.path = 'home';
  const event = directEvent(structuredClone(s));
  assert.equal(event.title, '이별');
  assert.ok(event.effects.money > 0);
});

test('hasCondition only reports the current region', () => {
  const s = createLife({ seed: 'cond' });
  const other = REGIONS.find(r => r.id !== currentRegion(s)).id;
  s.world.conditions = [{ id: 'league', region: other, since: 0, until: 5 }];
  assert.equal(hasCondition(s, 'league'), false);
  assert.equal(hasCondition(s, 'league', other), true);
});
