import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, parseSave, choose, advance, acknowledge } from '../src/engine.js';
import { addPokemon } from '../src/sim/party.js';
import { championships } from '../src/sim/battle.js';
import {
  emptyLegacy, recordLife, parseLegacy, chooseHeir, heirCandidates, heritageFor, validHeritage, summarizeLife,
  endingCards, trainerCard, medalsOf, epithet, dexProgress, legacyTotals, MEDALS, DEX_REGIONS, DEX_TOTAL, INHERITANCE_CAP, LEGACY_LIVES,
} from '../src/sim/legacy.js';
import { LEAGUE_SAGAS, LEAGUE_TRAVEL, LEAGUE_REGIONS, leagueLevels, remainingSchedule, championFlag, LEAGUE_STEP } from '../src/data/league-sagas.js';
import { LEGACY_EVENTS } from '../src/data/legacy-events.js';
import { TOWNS } from '../src/data/world.js';
import { present, play } from './helpers.js';

const ended = seed => play(createLife({ seed }), { until: s => s.ended });
const finished = ended('legacy-life');

test('the national dex ranges cover every species exactly once', () => {
  assert.equal(DEX_REGIONS.reduce((n, r) => n + r.total, 0), DEX_TOTAL);
  for (let i = 1; i < DEX_REGIONS.length; i++) assert.equal(DEX_REGIONS[i].from, DEX_REGIONS[i - 1].to + 1);
  const progress = dexProgress([1, 2, 151, 152, 1025]);
  assert.equal(progress[0].count, 3);
  assert.equal(progress[1].count, 1);
  assert.equal(progress.at(-1).count, 1);
});

test('ending cards, medals and the trainer card are derived from a finished life', () => {
  const cards = endingCards(finished);
  assert.ok(cards.length >= 6);
  assert.equal(new Set(cards.map(c => c.id)).size, cards.length, 'card ids are unique within a life');
  assert.equal(cards[0].kind, 'hall');
  assert.equal(cards.at(-1).kind, 'epitaph');
  for (const c of cards) assert.ok(c.title && c.body && ['common', 'rare', 'epic', 'legendary'].includes(c.rarity), c.id);
  assert.deepEqual(endingCards(finished), cards, 'deterministic');
  const card = trainerCard(finished);
  assert.ok(card.stars.length >= 0 && card.stars.length <= 5);
  assert.equal(card.epithet, epithet(finished));
  const medals = medalsOf(finished);
  assert.ok(medals.includes('first-partner'));
  assert.ok(medals.every(id => MEDALS.some(m => m.id === id)));
  assert.equal(new Set(MEDALS.map(m => m.id)).size, MEDALS.length);
});

test('a champion gets champion cards, medals and a star', () => {
  const s = structuredClone(finished);
  // The simulated life may already hold titles; start from a clean slate so the counts below are exact.
  for (const r of LEAGUE_REGIONS) delete s.flags[championFlag(r)];
  s.infamy = 0;
  s.flags[championFlag(LEAGUE_REGIONS[0])] = true;
  s.flags[championFlag(LEAGUE_REGIONS[3])] = true;
  assert.equal(championships(s), 2);
  assert.ok(endingCards(s).some(c => c.id === 'champion:kanto' && c.rarity === 'legendary'));
  assert.ok(medalsOf(s).includes('champion'));
  assert.ok(trainerCard(s).stars.includes('league'));
  assert.match(epithet(s), /2개 지방의 챔피언/);
});

test('recording lives builds a cumulative dex and medal case, and is idempotent', () => {
  const first = recordLife(emptyLegacy(), finished);
  assert.equal(first.lives.length, 1);
  assert.deepEqual(recordLife(first, finished), first, 'the same life is not recorded twice');
  assert.equal(recordLife(first, createLife({ seed: 'alive' })).lives.length, 1, 'unfinished lives are not recorded');
  const other = ended('legacy-other');
  const both = recordLife(first, other);
  assert.equal(both.lives.length, 2);
  assert.equal(both.lives[0].name, other.name, 'newest first');
  for (const id of [...finished.seen, ...other.seen]) assert.ok(both.dex.seen.includes(id));
  assert.ok(both.dex.owned.every(id => both.dex.seen.includes(id)));
  assert.equal(both.medals['first-partner'].count, 2);
  assert.deepEqual(parseLegacy(JSON.stringify(both)), both, 'round-trips through storage');
  const totals = legacyTotals(both);
  assert.equal(totals.lives, 2);
  assert.equal(totals.years, finished.age + other.age);
  assert.ok(totals.seen >= finished.seen.length);
});

test('a corrupt legacy store becomes an empty legacy instead of throwing', () => {
  for (const raw of ['', '{', 'null', '[]', JSON.stringify({ version: 99 }), JSON.stringify({ ...emptyLegacy(), dex: { seen: [0], owned: [], shiny: [] } })])
    assert.deepEqual(parseLegacy(raw), emptyLegacy());
  let legacy = emptyLegacy();
  for (let i = 0; i < LEGACY_LIVES + 3; i++) {
    const s = structuredClone(finished); s.seed = `copy-${i}`;
    legacy = recordLife(legacy, s);
  }
  assert.equal(legacy.lives.length, LEGACY_LIVES, 'the hall keeps the most recent lives');
});

test('heirs: one egg per family, never legendary, with a capped inheritance', () => {
  const s = createLife({ seed: 'heir', town: 'pallet' });
  s.age = 70; s.money = 50000;
  addPokemon(s, 6, { origin: 'partner', xp: 3000, affection: 90 });
  addPokemon(s, 5, { xp: 500, affection: 95 });
  addPokemon(s, 150);
  addPokemon(s, 131, { xp: 100, affection: 40, shiny: true });
  const candidates = heirCandidates(s);
  assert.deepEqual(candidates.map(c => c.egg), [4, 131], 'charizard and charmeleon share one egg; mewtwo is excluded');
  const heritage = heritageFor(s, candidates[1].uid);
  assert.equal(heritage.egg, 131);
  assert.equal(heritage.shiny, true);
  assert.equal(heritage.generation, 2);
  assert.equal(heritage.inheritance, INHERITANCE_CAP);
  assert.deepEqual(heritage.lineage, [s.name]);
  assert.ok(validHeritage(heritage));
  assert.equal(heritageFor(s, 9999), null);
  assert.equal(validHeritage({ ...heritage, egg: 150 }), false);
  assert.equal(validHeritage({ ...heritage, inheritance: INHERITANCE_CAP + 1 }), false);
  const legacy = chooseHeir(emptyLegacy(), s, candidates[0].uid);
  assert.equal(legacy.heir.egg, 4);
  assert.equal(chooseHeir(legacy, s, null).heir, null);
});

test('an inherited egg hatches into the first partner, and the lineage continues', () => {
  const parent = structuredClone(finished);
  const [candidate] = heirCandidates(parent);
  const heritage = heritageFor(parent, candidate.uid);
  const child = createLife({ seed: 'second-generation', heritage });
  const plain = createLife({ seed: 'second-generation' });
  assert.equal(child.money, plain.money + heritage.inheritance);
  assert.match(child.log[0].body, /대째 트레이너 가문/);
  assert.equal(createLife({ seed: 'second-generation', heritage: { ...heritage, egg: 150 } }).heritage, null, 'invalid heritage is ignored');
  let s = child;
  while (s.age < 6 || s.encounter || s.pending) s = s.encounter ? acknowledge(s) : s.pending ? choose(s, 0) : advance(s);
  const partner = s.party.find(m => m.origin === 'partner');
  assert.equal(partner.id, candidate.egg);
  assert.equal(partner.shiny, candidate.shiny);
  assert.ok(parseSave(JSON.stringify(s)));
  const grown = play(child, { until: x => x.ended });
  assert.ok(medalsOf(grown).includes('heir'));
  assert.ok(endingCards(grown).some(c => c.kind === 'heritage'));
  const third = heritageFor(grown, heirCandidates(grown)[0].uid);
  assert.equal(third.generation, 3);
  assert.deepEqual(third.lineage, [parent.name, grown.name]);
  assert.equal(summarizeLife(grown).generation, 2);
});

test('heritage events build valid choices only for inheriting lives', () => {
  // Every optional part of a heritage (the ancestor's partner and rival) is present, so every event can open.
  const heritage = { partner: { id: 25, level: 60 }, rival: '그린', ...heritageFor(finished, heirCandidates(finished)[0].uid) };
  const base = play(createLife({ seed: 'heritage-events', heritage }), { until: x => x.age >= 20 && !x.pending && !x.encounter && !x.scheduledEvent });
  base.relationship.children = 1;
  base.town = TOWNS.find(t => t.id !== heritage.hometown).id;
  const none = structuredClone(base); none.heritage = null;
  for (const st of LEGACY_EVENTS) {
    assert.equal(Boolean(st.when(none)), false, st.id);
    const s = structuredClone(base); s.age = Math.max(st.min, Math.min(st.max, s.age));
    assert.ok(st.when(s), st.id);
    const event = st.build(s);
    assert.ok(event.choices.some(c => !c.cost));
    for (let i = 0; i < event.choices.length; i++) assert.ok(parseSave(JSON.stringify(choose(present(structuredClone(s), event), i))), `${st.id} ${i}`);
  }
});

// ── League pacing ──
function contender(seed = 'league-pace') {
  const s = createLife({ seed, town: 'pallet', goal: 'champion' });
  s.age = 30; s.money = 5000;
  addPokemon(s, 149, { origin: 'partner', xp: 2400 });
  addPokemon(s, 6, { xp: 2400 }); addPokemon(s, 9, { xp: 2400 });
  s.encounter = null;
  return s;
}

test('league levels start at a regional level and rise with every title', () => {
  const s = contender();
  const first = leagueLevels(s);
  assert.equal(first.final, 54);
  assert.ok(first.qualifier < first.elites[0] && first.elites[3] < first.final);
  s.flags[championFlag(LEAGUE_REGIONS[1])] = true;
  assert.equal(leagueLevels(s).final, 54 + LEAGUE_STEP);
  for (const r of LEAGUE_REGIONS) s.flags[championFlag(r)] = true;
  assert.ok(leagueLevels(s).final <= 95);
});

test('a gym expedition wins several badges in one decision and stops at eight', () => {
  const s = contender(); s.flags['league-kanto-licensed'] = true; s.game.badges.kanto = 6;
  const circuit = LEAGUE_SAGAS.find(x => x.id === 'league-kanto-circuit');
  const event = circuit.build(structuredClone(s));
  const trip = event.choices.findIndex(c => c.battle?.opponents);
  assert.ok(trip > 0);
  assert.equal(event.choices[trip].battle.opponents.length, 2, 'only as many gyms as badges remain');
  const after = choose(present(structuredClone(s), event), trip);
  assert.equal(after.game.badges.kanto, 8);
  assert.ok(parseSave(JSON.stringify(after)));
  const fresh = contender(); fresh.flags['league-kanto-licensed'] = true;
  const full = circuit.build(structuredClone(fresh)).choices.find(c => c.battle?.opponents);
  assert.equal(full.battle.opponents.length, 4);
  assert.equal(full.cost, 150);
});

test('a season run keeps each cleared stage even when it ends in a loss, and only a full run crowns', () => {
  const r = LEAGUE_REGIONS[0], s = contender();
  s.flags['league-kanto-licensed'] = true; s.game.badges.kanto = 8;
  const schedule = remainingSchedule(s, r);
  assert.equal(schedule.length, 2 + 4 + 3);
  assert.deepEqual(schedule.map(x => x[2]).filter(Boolean), ['league-kanto-qualified', 'league-kanto-elite-0', 'league-kanto-elite-1', 'league-kanto-elite-2', 'league-kanto-elite-3']);
  const qualifier = LEAGUE_SAGAS.find(x => x.id === 'league-kanto-qualifier');
  const event = qualifier.build(structuredClone(s));
  const season = event.choices.findIndex(c => c.battle?.flags);
  // Strong party: the whole season, then the title and the hall of fame.
  const won = choose(present(structuredClone(s), event), season);
  assert.ok(won.flags['league-kanto-champion']);
  assert.ok(won.seeds.some(x => x.id === 'hall-of-fame'));
  // Weak party: lose somewhere in the middle, keep what was cleared, no title.
  const weak = structuredClone(s);
  for (const m of weak.party) m.xp = 700;
  let lost = null;
  for (let rng = 1; rng < 40 && !lost; rng++) {
    const t = structuredClone(weak); t.rng = rng;
    const out = choose(present(t, qualifier.build(structuredClone(t))), season);
    if (out.flags['league-kanto-qualified'] && !out.flags['league-kanto-champion']) lost = out;
  }
  assert.ok(lost, 'a mid-season loss keeps earlier stages');
  assert.ok(!lost.seeds.some(x => x.id === 'hall-of-fame'));
  assert.ok(parseSave(JSON.stringify(lost)));
  // The schedule picks up where the trainer stopped.
  assert.ok(remainingSchedule(lost, r).length < schedule.length);
});

test('after a title, a champion-goal trainer can move on and register in another region', () => {
  const s = contender(); s.flags[championFlag(LEAGUE_REGIONS[0])] = true;
  const [travel] = LEAGUE_TRAVEL;
  assert.ok(travel.when(s));
  const event = travel.build(structuredClone(s));
  assert.ok(event.choices.length >= 2 && event.choices.some(c => !c.cost));
  const moved = choose(present(structuredClone(s), event), 0);
  const region = TOWNS.find(t => t.id === moved.town).map;
  assert.notEqual(region, 'kanto');
  assert.ok(moved.flags[`league-${region}-licensed`]);
  assert.ok(parseSave(JSON.stringify(moved)));
  const free = structuredClone(s); free.goal = 'free'; free.career = 'merchant';
  assert.equal(Boolean(travel.when(free)), false, 'only for the league goal or travelling trainers');
});

test('battle series validation rejects mismatched levels and flags', () => {
  const s = contender();
  const event = { kind: 'choice', title: '검증', body: '검증', choices: [{ label: '출전', description: '연전', effects: {}, outcome: '출전했다.',
    battle: { kind: 'league', opponents: [10, 13], levels: [5, 6], flags: [null, 'test-flag'] } }] };
  const pending = present(s, event);
  assert.ok(parseSave(JSON.stringify(pending)));
  const won = choose(pending, 0);
  assert.ok(won.flags['test-flag']);
  pending.log.at(-1).choices[0].battle.levels = [5];
  assert.equal(parseSave(JSON.stringify(pending)), null);
  pending.log.at(-1).choices[0].battle.levels = [5, 6];
  pending.log.at(-1).choices[0].battle.flags = [null];
  assert.equal(parseSave(JSON.stringify(pending)), null);
});
