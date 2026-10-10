import test from 'node:test';
import assert from 'node:assert/strict';
import { choose, advance, parseSave } from '../src/engine.js';
import { STORYLETS } from '../src/data/storylets.js';
import { CONSEQUENCES } from '../src/data/consequences.js';
import { currentRegion } from '../src/sim/world.js';
import { lifeAt, play, present } from './helpers.js';

const settledAt = (age, seed) => play(lifeAt(age, seed), { until: x => !x.pending && !x.encounter && !x.scheduledEvent });
const storylet = id => STORYLETS.find(st => st.id === id);

test('lending money plants a consequence that returns as a journal record years later', () => {
  const s = settledAt(30, 'loan');
  s.cast.friend.needsHelp = true;
  s.money = 3000;
  const lent = choose(present(s, storylet('friend-needs-help').build(structuredClone(s))), 0);
  const seed = lent.seeds.find(x => x.id === 'friend-repay');
  assert.ok(seed.at >= s.age + 2 && seed.at <= s.age + 5);
  assert.ok(lent.log.at(-1).resolution.lasting);
  const later = play(lent, { until: x => x.log.some(e => e.echo?.label === '500P를 빌려준다') || x.age > seed.at + 2 });
  const echo = later.log.find(e => e.echo?.label === '500P를 빌려준다');
  assert.ok(echo, 'the repayment shows up');
  assert.equal(echo.kind, 'echo');
  assert.equal(echo.echo.age, s.age);
  assert.ok(echo.effects.money > 0);
});

test('different answers to the same event lead to different futures', () => {
  const s = settledAt(9, 'rival');
  const event = storylet('rival-meet').build(structuredClone(s));
  const fight = choose(present(structuredClone(s), event), 0), train = choose(present(structuredClone(s), event), 1), ignore = choose(present(structuredClone(s), event), 2);
  assert.ok(fight.seeds.some(x => x.id === 'rival-rematch'));
  assert.ok(train.cast.rival.affinity > ignore.cast.rival.affinity);
  assert.equal(train.cast.rival.path, 'trainer');
  assert.ok(!ignore.seeds.some(x => x.id === 'rival-team-up'));
});

test('investments pay off according to the economy when they come due, not when they were made', () => {
  const s = settledAt(35, 'invest');
  const seed = { id: 'venture-result', at: s.age, origin: { age: 30, title: '친구의 동업 제안', label: '800P를 투자한다' }, data: { amount: 800 } };
  const boom = structuredClone(s), bust = structuredClone(s);
  boom.world.regions[currentRegion(s)].economy = 90;
  bust.world.regions[currentRegion(s)].economy = 10;
  assert.ok(CONSEQUENCES['venture-result'].build(boom, seed).effects.money > 800);
  assert.ok(CONSEQUENCES['venture-result'].build(bust, seed).effects.money < 800);
});

test('a due decision seed becomes the next main event and is marked as an echo', () => {
  const s = settledAt(33, 'debt');
  s.seeds.push({ id: 'debt-due', at: s.age + 1, origin: { age: s.age - 2, title: '줄어든 살림', label: '돈을 빌린다' }, data: { amount: 800 } });
  const next = play(s, { until: x => Boolean(x.pending) });
  const entry = next.log.find(e => e.id === next.pending);
  assert.equal(entry.title, '빚을 갚을 때');
  assert.equal(entry.echo.title, '줄어든 살림');
  assert.ok(entry.body.includes('2년 전') || entry.body.includes('3년 전'));
  assert.ok(parseSave(JSON.stringify(next)));
  assert.ok(!next.seeds.some(x => x.id === 'debt-due'));
});

test('seeds that can no longer happen expire quietly', () => {
  const s = settledAt(40, 'expire');
  s.cast.rival.path = 'retired';
  s.seeds.push({ id: 'rival-rematch', at: s.age - 6, origin: { age: 20, title: 't', label: 'l' }, data: {} });
  const next = advance(s);
  assert.ok(!next.seeds.some(x => x.id === 'rival-rematch'));
});
