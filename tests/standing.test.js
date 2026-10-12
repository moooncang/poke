import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, parseSave, choose, advance, fastForward, diminished, VERSION } from '../src/engine.js';
import { addPokemon } from '../src/sim/party.js';
import { tickStanding, takeLoan, standingOf, careerTitle, infamyTier, isWanted, inPrison, BANKRUPTCY_DEBT, LOAN_LIMIT, WANTED_INFAMY } from '../src/sim/standing.js';
import { CAREERS, CAREER_RANKS } from '../src/data/world.js';
import { careerReview, PROMOTION_REVIEW } from '../src/data/progression.js';
import { talentPathChoice } from '../src/data/talent-events.js';
import { medalsOf, endingCards, epithet } from '../src/sim/achievements.js';
import { present, play, lifeAt } from './helpers.js';
import { currentRegion } from '../src/sim/world.js';

const settled = (age, seed) => play(createLife({ seed }), { until: x => x.age >= age && !x.pending && !x.encounter && !x.scheduledEvent });

test('stat gains shrink near the top and stats drift back toward a living baseline', () => {
  assert.equal(diminished(50, 6), 6);
  assert.equal(diminished(72, 6), 3);
  assert.equal(diminished(90, 6), 2);
  assert.equal(diminished(90, -6), -6, 'losses are never softened');
  const s = settled(30, 'drift');
  s.stats.joy = 100; s.stats.wisdom = 100; s.debt = 2000; s.money = 0;
  const later = play(s, { until: x => x.age >= 36 });
  assert.ok(later.stats.wisdom < 95, `wisdom drifts down (${later.stats.wisdom})`);
  const ok = settled(30, 'drift'); ok.stats.joy = 100;
  const okLater = play(ok, { until: x => x.age >= 36 });
  assert.ok(play(s, { until: x => x.age >= 33 }).stats.joy <= okLater.stats.joy + 5, 'debt and an empty wallet pull happiness down');
});

test('effects can raise infamy and debt; both are validated and saved', () => {
  const s = settled(25, 'infamy');
  const event = { kind: 'choice', title: 't', body: 'b', choices: [{ label: 'x', description: 'd', outcome: 'o', effects: { infamy: 12, debt: 300, money: 200 } }, { label: 'y', description: 'd', outcome: 'o', effects: {} }] };
  const after = choose(present(structuredClone(s), event), 0);
  assert.equal(after.infamy, 12);
  assert.equal(after.debt, 300);
  assert.equal(infamyTier(after.infamy), '소문이 도는');
  assert.ok(parseSave(JSON.stringify(after)));
  assert.equal(parseSave(JSON.stringify({ ...after, infamy: 101 })), null);
  assert.equal(parseSave(JSON.stringify({ ...after, prison: 99 })), null);
});

test('debt charges interest, is repaid from spare money, and ends in bankruptcy past the limit', () => {
  const s = settled(30, 'debt');
  s.debt = 1000; s.money = 2000;
  tickStanding(s);
  assert.equal(s.debt, 1080 - Math.min(1080, 600));
  assert.equal(s.money, 1400);
  const broke = settled(30, 'debt');
  broke.money = 0; broke.debt = BANKRUPTCY_DEBT; for (let i = 0; i < 6; i++) addPokemon(broke, 16);
  const boxed = broke.box.length;
  const records = tickStanding(broke);
  assert.ok(records.some(r => r.title === '파산'));
  assert.equal(broke.debt, 0);
  assert.ok(broke.flags.bankrupt);
  assert.ok(broke.box.length < boxed, 'half the box is gone');
  assert.ok(parseSave(JSON.stringify(broke)));
  assert.ok(medalsOf(broke).includes('bankrupt'));
});

test('living costs that savings cannot cover become debt instead of vanishing', () => {
  const s = settled(30, 'shortfall');
  s.money = 0; s.career = null; s.work.retired = false; s.relationship = { ...s.relationship, status: 'married', children: 3 };
  const next = advance(s);
  assert.ok(next.debt > 0 || next.ledger.income >= next.ledger.expense, `a shortfall is recorded as debt (${next.debt})`);
});

test('loans are capped and the loan choice field works', () => {
  const s = settled(25, 'loan');
  assert.equal(takeLoan(s, LOAN_LIMIT + 1), false);
  const money = s.money;
  assert.equal(takeLoan(s, 1000), true);
  assert.equal(s.money, money + 1000);
  assert.equal(s.debt, 1000);
  const event = { kind: 'choice', title: 't', body: 'b', choices: [{ label: 'x', description: 'd', outcome: 'o', effects: {}, loan: 500 }] };
  const after = choose(present(structuredClone(s), event), 0);
  assert.equal(after.debt, 1500);
  assert.equal(parseSave(JSON.stringify({ ...after, log: after.log.map(e => e.choices ? { ...e, choices: [{ ...e.choices[0], loan: LOAN_LIMIT + 1 }] } : e) })), null);
});

test('a wanted outlaw can be arrested; prison blocks ordinary events and income, then releases', () => {
  const s = settled(30, 'prison');
  s.career = 'syndicate'; s.careerRank = 2; s.infamy = 95;
  let arrested = null;
  for (let r = 1; r < 60 && !arrested; r++) { const t = structuredClone(s); t.rng = r * 2654435761 >>> 0; const rec = tickStanding(t); if (rec.some(x => x.title === '체포')) arrested = t; }
  assert.ok(arrested, 'high infamy leads to an arrest within a few tries');
  assert.ok(inPrison(arrested));
  assert.equal(arrested.career, null, 'the syndicate drops an arrested member');
  const years = arrested.prison;
  let t = arrested;
  const start = t.age;
  t = play(t, { until: x => x.age >= start + years + 1 });
  assert.equal(t.prison, 0);
  assert.ok(t.log.some(e => e.title === '출소'));
  assert.ok(t.infamy < WANTED_INFAMY, 'time served clears the warrant');
  const jailed = t.log.filter(e => e.age > start && e.age <= start + years && e.choices);
  assert.ok(jailed.every(e => !e.auto), 'nothing is settled alone behind bars');
  assert.ok(t.history.filter(r => r.age > start && r.age <= start + years).every(r => r.income === 0), 'no income in prison');
  assert.ok(parseSave(JSON.stringify(t)));
  assert.ok(medalsOf(t).includes('arrested'));
});

test('the prison choice field, the syndicate career and losePokemon all apply through choices', () => {
  const s = settled(28, 'dark-fields');
  for (const id of [16, 19, 10]) addPokemon(s, id);
  const event = { kind: 'choice', title: 't', body: 'b', choices: [
    { label: 'join', description: 'd', outcome: 'o', effects: { infamy: 5 }, career: 'syndicate' },
    { label: 'lose', description: 'd', outcome: 'o', effects: {}, losePokemon: 'box' },
    { label: 'jail', description: 'd', outcome: 'o', effects: {}, prison: 2 },
  ] };
  const joined = choose(present(structuredClone(s), event), 0);
  assert.equal(joined.career, 'syndicate');
  assert.equal(joined.flags['syndicate-region'], currentRegion(s));
  assert.equal(careerTitle(joined), CAREER_RANKS.syndicate[0]);
  assert.ok(epithet(joined).includes(CAREER_RANKS.syndicate[0]));
  assert.ok(medalsOf(joined).includes('outlaw'));
  assert.ok(!careerReview(joined, 35).choices.some(c => c.career === 'syndicate'), 'reviews never offer the syndicate');
  const total = s.party.length + s.box.length;
  const lost = choose(present(structuredClone(s), event), 1);
  assert.equal(lost.party.length + lost.box.length, total - 1);
  assert.ok(lost.party.some(m => m.origin === 'partner'), 'the first partner never leaves');
  assert.ok(lost.queue.some(r => r.title === '떠난 동료'));
  const jailed = choose(present(structuredClone(joined), event), 2);
  assert.equal(jailed.prison, 2);
  assert.equal(jailed.career, null);
  for (const state of [joined, lost, jailed]) assert.ok(parseSave(JSON.stringify(state)));
  assert.ok(endingCards(jailed).some(c => c.kind === 'shadow'));
});

test('promotion reviews open every few working years and raise the rank on success', () => {
  const s = settled(30, 'promo');
  s.career = 'traveler'; s.work = { years: 4, satisfaction: 60, cut: 0, retired: false }; s.careerRank = 0; s.stats.courage = 100;
  assert.ok(PROMOTION_REVIEW.when(s));
  const event = PROMOTION_REVIEW.build(structuredClone(s));
  let promoted = null, failed = null;
  for (let r = 1; r <= 40 && !(promoted && failed); r++) {
    const t = structuredClone(s); t.rng = r * 7919;
    const after = choose(present(t, structuredClone(event)), 0);
    if (after.careerRank === 1) promoted ||= after; else failed ||= after;
  }
  assert.ok(promoted, 'a strong candidate passes the review');
  assert.equal(careerTitle(promoted), CAREER_RANKS.traveler[1]);
  if (failed) { assert.equal(failed.careerRank, 0); assert.equal(failed.work.satisfaction, s.work.satisfaction - 5); }
  s.careerRank = 5;
  assert.equal(Boolean(PROMOTION_REVIEW.when(s)), false);
});

test('talent paths say which career they prepare and that the job itself does not change', () => {
  const s = settled(16, 'talent-path');
  const choice = talentPathChoice(s, true);
  assert.match(choice.description, /계열 준비/);
  assert.match(choice.description, /직업은 바뀌지 않음/);
  assert.match(choice.label, /진로는 아직 정하지 않음/);
  assert.equal(choice.career, undefined);
});

test('the character card summary reflects job, place and conditions', () => {
  const s = settled(30, 'card');
  s.career = 'merchant'; s.careerRank = 3; s.debt = 1200;
  const st = standingOf(s);
  assert.match(st.job, new RegExp(CAREER_RANKS.merchant[3]));
  assert.ok(st.conditions.some(c => c.startsWith('빚')));
  s.infamy = WANTED_INFAMY;
  assert.ok(isWanted(s));
  assert.ok(standingOf(s).conditions.includes('수배 중'));
});

test('fastForward stops at the next decision and v5 saves migrate to v6', () => {
  const s = settled(20, 'ff');
  const next = fastForward(s);
  assert.ok(next.pending || next.encounter || next.ended);
  const old = structuredClone(s); old.version = 5; delete old.infamy; delete old.debt; delete old.prison;
  const migrated = parseSave(JSON.stringify(old));
  assert.equal(migrated.version, VERSION);
  assert.deepEqual([migrated.infamy, migrated.debt, migrated.prison], [0, 0, 0]);
});
