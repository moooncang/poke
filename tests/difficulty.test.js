import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, parseSave, choose, advance, successChance, VERSION } from '../src/engine.js';
import { DIFFICULTIES, DIFFICULTY_ORDER, diff, difficultyOf } from '../src/sim/difficulty.js';
import { addPokemon } from '../src/sim/party.js';
import { autoBattle } from '../src/sim/battle.js';
import { tickStanding } from '../src/sim/standing.js';
import { annualTraining } from '../src/data/progression.js';
import { medalsOf, trainerCard } from '../src/sim/achievements.js';
import { recordLife, emptyLegacy } from '../src/sim/legacy.js';
import { present, play } from './helpers.js';

const make = (difficulty, seed = 'diff') => createLife({ seed, difficulty });

test('every difficulty defines every knob, and unknown names fall back to normal', () => {
  const keys = Object.keys(DIFFICULTIES.normal).filter(k => !['name', 'detail'].includes(k));
  for (const id of DIFFICULTY_ORDER) for (const k of keys) assert.ok(k in DIFFICULTIES[id], `${id}.${k}`);
  assert.equal(make('nope').difficulty, 'normal');
  assert.equal(difficultyOf({}), 'normal');
  assert.equal(diff(make('legend'), 'income'), 0.6);
});

test('difficulty changes starting money, income, expenses, balls, lifespan and training', () => {
  const easy = make('easy'), normal = make('normal'), hard = make('hard'), legend = make('legend');
  assert.equal(easy.money, normal.money * 2);
  assert.equal(legend.money, Math.round(normal.money * 0.25));
  assert.ok(easy.lifespan > normal.lifespan && legend.lifespan < hard.lifespan);
  // Same seed and world, only the difficulty differs: the first working year is directly comparable.
  const worker = d => { const s = make(d, 'diff-work'); s.age = 29; s.career = 'traveler'; s.work = { years: 3, satisfaction: 60, cut: 0, retired: false }; s.money = 5000; s.debt = 0; s.game.balls = 10; s.encounter = null; return advance(s); };
  const e = worker('easy'), n = worker('normal'), l = worker('legend');
  assert.ok(e.ledger.income > n.ledger.income && n.ledger.income > l.ledger.income, `${e.ledger.income} > ${n.ledger.income} > ${l.ledger.income}`);
  assert.ok(e.ledger.expense < l.ledger.expense);
  assert.ok(e.game.balls > l.game.balls);
  const trainee = d => { const s = make(d); s.age = 25; s.career = 'traveler'; s.work.retired = false; return annualTraining(s); };
  assert.ok(trainee('easy') > trainee('normal') && trainee('normal') > trainee('legend'));
});

test('checks, trainer opponents and captures shift with difficulty; wild levels do not', () => {
  const choice = { challenge: { stat: 'courage', difficulty: 0 } };
  const at = d => { const s = make(d); s.stats.courage = 50; return successChance(s, choice); };
  assert.equal(at('easy'), at('normal') + 10);
  assert.equal(at('hard'), at('normal') - 8);
  assert.equal(at('legend'), at('normal') - 15);
  const fighter = d => { const s = make(d, 'diff-battle'); s.age = 20; addPokemon(s, 6, { origin: 'partner', xp: 1500 }); return s; };
  const gymLevel = d => autoBattle(fighter(d), { kind: 'gym', opponentId: 27, regionId: 'kanto' }).level;
  assert.ok(gymLevel('easy') < gymLevel('normal') && gymLevel('normal') < gymLevel('legend'));
  assert.equal(autoBattle(fighter('legend'), { kind: 'wild', opponentId: 16, regionId: 'kanto' }).level, autoBattle(fighter('normal'), { kind: 'wild', opponentId: 16, regionId: 'kanto' }).level);
  const catches = d => { let n = 0; for (let r = 1; r <= 40; r++) { const s = fighter(d); s.rng = r * 7919; if (autoBattle(s, { kind: 'wild', opponentId: 16, regionId: 'kanto', allowCapture: true }).result === 'caught') n++; } return n; };
  assert.ok(catches('easy') >= catches('legend'));
});

test('debt interest, bankruptcy and arrests are harsher on higher difficulties', () => {
  const owe = d => { const s = make(d, 'diff-debt'); s.age = 30; s.debt = 1000; s.money = 0; tickStanding(s); return s.debt; };
  assert.ok(owe('easy') < owe('normal') && owe('normal') < owe('legend'));
  const broke = make('legend', 'diff-bankrupt'); broke.age = 30; broke.money = 0; broke.debt = 4000;
  assert.ok(tickStanding(broke).some(r => r.title === '파산'), 'legend goes bankrupt at 4,000P');
  const fine = make('easy', 'diff-bankrupt'); fine.age = 30; fine.money = 0; fine.debt = 4000;
  assert.ok(!tickStanding(fine).some(r => r.title === '파산'));
  const arrests = d => { let n = 0; for (let r = 1; r <= 60; r++) { const s = make(d, 'diff-arrest'); s.age = 30; s.infamy = 70; s.rng = r * 104729; if (tickStanding(s).some(x => x.title === '체포')) n++; } return n; };
  assert.ok(arrests('legend') > arrests('easy'));
});

test('difficulty is saved, validated, migrated and shown on the trainer card, medals and the hall', () => {
  const s = play(make('hard', 'diff-save'), { until: x => x.age >= 20 });
  assert.ok(parseSave(JSON.stringify(s)));
  assert.equal(parseSave(JSON.stringify({ ...s, difficulty: 'insane' })), null);
  const v6 = structuredClone(s); v6.version = 6; delete v6.difficulty;
  const migrated = parseSave(JSON.stringify(v6));
  assert.equal(migrated.version, VERSION);
  assert.equal(migrated.difficulty, 'normal');
  assert.equal(trainerCard(s).difficulty, 'hard');
  const done = play(make('legend', 'diff-done'), { until: x => x.ended });
  assert.ok(medalsOf(done).includes('legend-life'));
  assert.ok(medalsOf(done).includes('hard-life'));
  assert.ok(!medalsOf(s).includes('hard-life'), 'only a finished life counts');
  assert.equal(recordLife(emptyLegacy(), done).lives[0].difficulty, 'legend');
});

test('lives on easy and legend really diverge', () => {
  const run = d => play(make(d, 'diff-run'), { until: x => x.ended });
  const easy = run('easy'), legend = run('legend');
  const peak = s => Math.max(...s.history.map(r => r.money));
  assert.ok(peak(easy) > peak(legend) * 1.5, `peak money ${peak(easy)} vs ${peak(legend)}`);
  assert.ok(easy.history.filter(r => r.debt > 0).length <= legend.history.filter(r => r.debt > 0).length);
  assert.ok(parseSave(JSON.stringify(easy)) && parseSave(JSON.stringify(legend)));
});
