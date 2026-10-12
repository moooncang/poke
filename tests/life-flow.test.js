import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, advance, autoChoice, acknowledge, choose, parseSave } from '../src/engine.js';
import { play } from './helpers.js';

test('random birth is reproducible and varied', () => {
  const lives = Array.from({ length: 20 }, (_, i) => createLife({ seed: 'birth' + i }));
  assert.ok(new Set(lives.map(s => s.town)).size > 5);
  assert.ok(new Set(lives.map(s => s.background.id)).size > 4);
  assert.ok(new Set(lives.map(s => s.cast.friend.name)).size > 3);
  assert.deepEqual(createLife({ seed: 'fixed' }), createLife({ seed: 'fixed' }));
});

test('automatic records separate decisions by 4–7 entries; only learning and first career are age-fixed', () => {
  for (const seed of ['schedule-a', 'schedule-b']) {
    let s = createLife({ seed }), steps = 0, lastDecision = -1;
    while (!s.ended && steps++ < 8000) {
      if (s.encounter) s = acknowledge(s);
      else if (s.pending) {
        const index = s.log.findIndex(e => e.id === s.pending);
        if (lastDecision >= 0) { const gap = index - lastDecision - 1; assert.ok(gap >= 4 && gap <= 7, `gap ${gap}`); }
        lastDecision = index;
        const n = choose(s, 0); s = n === s ? autoChoice(s) : n;
        assert.equal(s.pending, null);
      } else {
        const length = s.log.length, age = s.age, deferred = Boolean(s.scheduledEvent);
        s = advance(s);
        assert.equal(s.log.length, length + 1);
        assert.equal(s.age, deferred ? age : age + 1);
      }
    }
    assert.ok(s.ended);
    assert.ok(s.log.filter(e => e.automatic).length > s.log.filter(e => e.choices).length * 2);
    for (const [age, title] of [[7, '어린 시절의 학습 방식'], [12, '성장기 활동 방향'], [16, '진로 선택'], [18, '학교 졸업 후의 선택']]) assert.ok(s.log.some(e => e.age === age && e.title === title));
    assert.ok(parseSave(JSON.stringify(s)));
  }
});

test('two lives from the same birth town face mostly different decisions at each age', () => {
  const decisions = seed => play(createLife({ seed, town: 'pallet' })).log.filter(e => e.choices).map(e => `${e.age}:${e.title}`);
  const a = decisions('diverge-1'), b = new Set(decisions('diverge-2'));
  assert.ok(a.filter(key => b.has(key)).length / a.length < 0.35, 'only the fixed learning and career stages line up');
});

test('the first record after a choice follows the chosen activity and survives a save', () => {
  let s = play(createLife({ seed: 'activity-save' }), { until: s => s.pending && s.age === 7 });
  s = choose(s, 0);
  assert.equal(s.education, 'school');
  s = advance(s);
  assert.ok(s.log.at(-1).automatic);
  assert.equal(s.log.at(-1).parentId, s.activity.parentId);
  assert.equal(s.activity.mode, 'wisdom');
  const saved = parseSave(JSON.stringify(s));
  assert.deepEqual(advance(saved), advance(s));
});

test('learning style keeps shaping stats every year until it changes', () => {
  const base = play(createLife({ seed: 'learning' }), { until: s => s.pending && s.age === 7 });
  const school = play(choose(base, 0), { until: s => s.age === 11 && !s.scheduledEvent, decide: s => s.log.find(e => e.id === s.pending).choices.length - 1 });
  const home = play(choose(base, 1), { until: s => s.age === 11 && !s.scheduledEvent, decide: s => s.log.find(e => e.id === s.pending).choices.length - 1 });
  assert.equal(school.education, 'school');
  assert.equal(home.education, 'home');
  assert.notDeepEqual(school.stats, home.stats);
});

test('non-school route avoids graduation and retains the option of later study', () => {
  const route = { 7: 1, 12: 1, 16: 4, 18: 3 };
  const s = play(createLife({ seed: 'no-school' }), {
    until: s => s.age >= 22 && !s.scheduledEvent,
    decide: s => route[s.age] ?? s.log.find(e => e.id === s.pending).choices.length - 1,
  });
  // Events the character settled alone (entry.auto) are not the milestone decisions.
  assert.equal(s.log.find(e => e.age === 18 && e.choices && !e.auto).title, '성인기의 새로운 방향');
  const plan = s.log.findLast(e => e.choices && !e.auto);
  assert.equal(plan.title, '앞으로의 활동 계획');
  assert.equal(s.education, 'travel');
  assert.ok(plan.choices.some(c => c.education === 'study'));
  assert.ok(parseSave(JSON.stringify(s)));
});

test('relationships progress across a life and can end in marriage', () => {
  let married = 0;
  for (let i = 0; i < 10; i++) {
    const s = play(createLife({ seed: `romance-${i}` }), { decide: s => s.log.find(e => e.id === s.pending).choices.some(c => c.relationship) ? 0 : s.log.find(e => e.id === s.pending).choices.length - 1 });
    if (s.relationship.marriedAt) { married++; assert.ok(s.relationship.marriedAt >= 19); }
  }
  assert.ok(married >= 1);
});
