import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, parseSave, advance, setPartyMode, togglePin, movePokemon, setLead, setGoal, choose, autoChoice } from '../src/engine.js';
import { addPokemon, reorganize, growParty, BOX_TRAINING, PARTY_LIMIT } from '../src/sim/party.js';
import { autoBattle, LEAD_PREFERENCE } from '../src/sim/battle.js';
import { goalWeight, goalFit, GOALS } from '../src/sim/goals.js';
import { annualTraining } from '../src/data/progression.js';
import { present, lifeAt, play } from './helpers.js';

// Partner + five members; the last one (uid 6) is weak but the player's favourite.
function trainer() {
  const s = createLife({ seed: 'control', town: 'pallet' });
  s.age = 30; s.disposition = { bold: 30, curious: 0, caring: 0, pragmatic: 0, easygoing: 0 };
  addPokemon(s, 25, { origin: 'partner', xp: 1000, affection: 80 });
  for (let i = 0; i < 4; i++) addPokemon(s, 16, { xp: 900, affection: 50 });
  addPokemon(s, 129, { xp: 0, affection: 20 });
  return s;
}
const favourite = s => s.party.find(m => m.id === 129);

test('a pinned favourite is never boxed by the automatic line-up', () => {
  const plain = trainer();
  addPokemon(plain, 16, { xp: 900 });
  assert.equal(plain.box[0].id, 129, 'without a pin, the bold trainer boxes the weakest member');

  const pinned = togglePin(trainer(), 6);
  assert.deepEqual(pinned.partyPlan.pinned, [6]);
  addPokemon(pinned, 16, { xp: 900 });
  assert.ok(favourite(pinned), 'the pinned member stays');
  assert.equal(pinned.party.length, PARTY_LIMIT);
  for (let i = 0; i < 5; i++) addPokemon(pinned, 149, { xp: 5000, affection: 100 });
  reorganize(pinned);
  assert.ok(favourite(pinned), 'even against much stronger boxed members');
  assert.ok(parseSave(JSON.stringify(pinned)));
  assert.deepEqual(togglePin(pinned, 6).partyPlan.pinned, [], 'toggling again unpins');
});

test('manual mode keeps the line-up and sends newcomers to the box; legendaries still join', () => {
  const s = setPartyMode(trainer(), 'manual');
  const before = s.party.map(m => m.uid);
  const { record } = addPokemon(s, 16, { xp: 5000 });
  assert.deepEqual(s.party.map(m => m.uid), before);
  assert.equal(s.box.at(-1).id, 16);
  assert.match(record.body, /PC 박스/);
  assert.equal(reorganize(s), null, 'no yearly reshuffle in manual mode');
  const { member } = addPokemon(s, 150);
  assert.ok(s.party.includes(member), 'a legendary always joins the party');
  assert.equal(s.party.length, PARTY_LIMIT);
  assert.ok(parseSave(JSON.stringify(s)));
});

test('manual moves: swap into a full party, box a member, set the lead; illegal moves change nothing', () => {
  let s = setPartyMode(trainer(), 'manual');
  addPokemon(s, 133, { xp: 300 });
  const boxed = s.box[0];
  assert.equal(movePokemon(s, boxed.uid), s, 'a full party needs someone to swap out');
  const swapped = movePokemon(s, boxed.uid, 2);
  assert.ok(swapped.party.some(m => m.uid === boxed.uid));
  assert.ok(swapped.box.some(m => m.uid === 2));
  assert.ok(swapped.partyPlan.pinned.includes(boxed.uid), 'a member the player brought in is pinned');
  assert.notEqual(swapped, s);
  assert.ok(s.box.some(m => m.uid === boxed.uid), 'the input state is not mutated');

  const boxedOut = movePokemon(swapped, 3);
  assert.equal(boxedOut.party.length, PARTY_LIMIT - 1);
  const back = movePokemon(boxedOut, 3);
  assert.equal(back.party.length, PARTY_LIMIT, 'with room, a member joins without a swap');

  const led = setLead(back, 6);
  assert.equal(led.party[0].uid, 6);
  assert.equal(setLead(led, 6), led, 'already leading');
  assert.equal(setLead(led, 999), led);

  const legend = trainer(); addPokemon(legend, 150);
  const legendUid = legend.party.find(m => m.locked).uid;
  assert.equal(movePokemon(legend, legendUid), legend, 'legendaries cannot be boxed');
  assert.equal(togglePin(legend, legendUid), legend, 'legendaries need no pin');
  const solo = createLife({ seed: 'solo' }); addPokemon(solo, 25, { origin: 'partner' });
  assert.equal(movePokemon(solo, 1), solo, 'the last member cannot be boxed');
  assert.equal(setPartyMode(solo, 'nonsense'), solo);
  for (const state of [swapped, boxedOut, back, led]) assert.ok(parseSave(JSON.stringify(state)));
});

test('the chosen lead goes first unless another matchup is clearly better', () => {
  const s = createLife({ seed: 'lead', town: 'pallet' });
  addPokemon(s, 25, { origin: 'partner', xp: 1000 });
  addPokemon(s, 7, { xp: 1000 });
  const battle = (state, opponentId) => autoBattle(structuredClone(state), { kind: 'wild', opponentId, regionId: 'kanto' }).lead.id;
  // Against a plain normal type both are fine: whoever the player put first goes first.
  assert.equal(battle(s, 19), 25);
  assert.equal(battle(setLead(s, 2), 19), 7);
  // Electric moves cannot touch a ground type and water hits it hard: the trainer switches despite the preference.
  assert.equal(battle(s, 27), 7);
  assert.ok(LEAD_PREFERENCE > 0);
});

test('boxed members keep a share of yearly training', () => {
  const s = trainer();
  addPokemon(s, 16, { xp: 900 });
  const boxed = s.box[0], before = boxed.xp;
  growParty(s, 40);
  assert.equal(boxed.xp, before + Math.floor(40 * BOX_TRAINING));
});

test('party plans survive saves, pins must reference real members, and v3 saves migrate', () => {
  const s = togglePin(trainer(), 6);
  assert.equal(parseSave(JSON.stringify({ ...s, partyPlan: { mode: 'auto', pinned: [999] } })), null);
  assert.equal(parseSave(JSON.stringify({ ...s, partyPlan: { mode: 'sideways', pinned: [] } })), null);
  assert.equal(parseSave(JSON.stringify({ ...s, partyPlan: { mode: 'auto', pinned: [6, 6] } })), null);
  assert.equal(parseSave(JSON.stringify({ ...s, goal: 'world-domination' })), null);
  const v3 = structuredClone(s); v3.version = 3; delete v3.goal; delete v3.partyPlan; delete v3.heritage;
  const migrated = parseSave(JSON.stringify(v3));
  assert.equal(migrated.version, 4);
  assert.equal(migrated.goal, 'free');
  assert.deepEqual(migrated.partyPlan, { mode: 'auto', pinned: [] });
  assert.equal(migrated.heritage, null);
});

test('life goals tilt event categories, auto decisions and training', () => {
  const s = createLife({ seed: 'goals' });
  assert.equal(s.goal, 'free');
  assert.equal(createLife({ seed: 'goals', goal: 'nope' }).goal, 'free');
  const champion = setGoal(s, 'champion');
  assert.notEqual(champion, s);
  assert.equal(setGoal(champion, 'champion'), champion);
  assert.equal(s.goal, 'free', 'input untouched');
  assert.equal(goalWeight(champion, 'league'), GOALS.champion.weights.league);
  assert.equal(goalWeight(s, 'league'), 1);
  assert.ok(goalFit(champion, { battle: { kind: 'league' } }) > goalFit(champion, { effects: { joy: 2 } }));
  assert.ok(goalFit(champion, { flag: 'league-kanto-withdrawn' }) < 1);
  assert.ok(goalFit(setGoal(s, 'collector'), { captureJoin: 16 }) > 1);
  const traveler = lifeAt(20, 'goal-train');
  traveler.career = 'traveler'; traveler.work.retired = false;
  assert.ok(annualTraining(setGoal(traveler, 'champion')) > annualTraining(traveler));
  assert.ok(parseSave(JSON.stringify(champion)));
});

test('a champion-goal life is deterministic and reaches the league far more often', () => {
  const run = goal => play(createLife({ seed: 'goal-run', goal }), { until: x => x.age >= 45 });
  const a = run('champion'), b = run('champion');
  assert.deepEqual(a, b);
  const leagueEvents = s => s.log.filter(e => /^league-/.test(e.sourceId || '')).length;
  assert.ok(leagueEvents(a) > leagueEvents(run('free')) + 5, `${leagueEvents(a)} league decisions`);
  assert.ok(Object.keys(a.flags).some(k => /^league-[a-z]+-licensed$/.test(k)));
});
