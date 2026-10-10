import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, choose, parseSave } from '../src/engine.js';
import { annualTraining, careerReview, CAREER_REVIEWS } from '../src/data/progression.js';
import { ALL_STORYLETS } from '../src/sim/director.js';
import { addPokemon } from '../src/sim/party.js';
import { play, present } from './helpers.js';

test('profession, education and health affect annual growth', () => {
  const s = createLife({ seed: 'growth' });
  s.career = 'traveler'; const trainer = annualTraining(s);
  s.career = 'merchant'; assert.ok(trainer > annualTraining(s));
  const base = annualTraining(s); s.education = 'apprentice'; assert.ok(annualTraining(s) > base);
  const healthy = annualTraining(s); s.stats.vitality = 20; assert.ok(annualTraining(s) < healthy);
});

test('career reviews adapt to employment and education; a failed promotion keeps the job', () => {
  const s = createLife({ seed: 'career' });
  for (const phase of Object.keys(CAREER_REVIEWS).map(Number)) assert.ok(careerReview(s, phase).choices.length >= 3);
  s.age = 26; s.career = 'keeper';
  const review = careerReview(s, 26);
  assert.ok(review.choices.some(c => c.promotion));
  assert.ok(review.choices.some(c => c.leaveCareer));
  const before = review.choices.find(c => c.career === 'researcher').challenge.difficulty;
  s.education = 'academy';
  assert.ok(careerReview(s, 26).choices.find(c => c.career === 'researcher').challenge.difficulty < before);
  s.stats.bond = 0; s.rng = 1;
  const failed = choose(present(s, careerReview(s, 26)), 0);
  assert.equal(failed.career, 'keeper');
  assert.equal(failed.careerRank, 0);
});

test('a promotion raises the career rank and the yearly income', () => {
  const base = play(createLife({ seed: 'promotion' }), { until: x => x.age >= 30 && !x.pending && !x.encounter && !x.scheduledEvent });
  base.career = 'keeper'; base.work = { years: 3, satisfaction: 60, cut: 0, retired: false }; base.stats.bond = 100;
  let promoted;
  for (let rng = 1; rng < 30 && !promoted; rng++) {
    const s = structuredClone(base); s.rng = rng;
    const after = choose(present(s, careerReview(s, 35)), 0);
    if (after.careerRank === (base.careerRank || 0) + 1) promoted = after;
  }
  assert.ok(promoted);
  const plain = structuredClone(promoted); plain.careerRank = base.careerRank || 0;
  const next = x => play(x, { until: y => y.age > x.age });
  assert.ok(next(promoted).ledger.income > next(plain).ledger.income);
});

test('career reviews arrive within each stage of a real life', () => {
  const s = play(createLife({ seed: 'career-life' }));
  for (const phase of [26, 35, 40, 50]) {
    if (s.age < phase + 4) continue;
    assert.ok(s.log.some(e => e.title === CAREER_REVIEWS[phase] && e.age >= phase && e.age <= phase + 3), `${phase}`);
  }
});

test('a successful lure capture overflows into the box and a failure grants no Pokémon', () => {
  const wild = ALL_STORYLETS.find(st => st.id === 'wild-encounter');
  const s = createLife({ seed: 'catch' }); s.age = 20; s.stats.bond = 100;
  for (let i = 0; i < 6; i++) addPokemon(s, 25, { xp: 100, origin: i ? 'wild' : 'partner' });
  const ready = present(s, wild.build(s)); ready.rng = 1;
  const result = choose(ready, 1);
  assert.equal(result.party.length, 6);
  assert.equal(result.box.length, 1);
  assert.equal(result.game.catches, 1);
  assert.equal(result.money, ready.money - 60);
  assert.ok(parseSave(JSON.stringify(result)));
  ready.stats.bond = 0; ready.rng = 1000;
  const failed = choose(ready, 1);
  assert.equal(failed.log.at(-1).resolution.check.success, false);
  assert.equal(failed.box.length, 0);
});

test('early life offers capture opportunities while respecting milestone ages', () => {
  const s = play(createLife({ seed: 'capture-schedule' }), { until: x => x.age >= 26 });
  assert.ok(s.log.filter(e => e.sourceId?.startsWith('wild-encounter')).length >= 4);
  assert.ok(s.log.some(e => e.title === '진로 선택' && e.age === 16));
});
