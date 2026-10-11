import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, parseSave, choose, renamePokemon, VERSION } from '../src/engine.js';
import { addPokemon, movePokemon, NICKNAME_LIMIT } from '../src/sim/party.js';
import { HISTORY_KEYS, series, historyHighlights } from '../src/sim/history.js';
import { runContest, nextContestRank, ribbonFlag, contestEntrant, CONTEST_CATEGORIES } from '../src/sim/contest.js';
import { CONTEST_EVENTS } from '../src/data/contests.js';
import { FRONTIER_EVENTS, FACILITIES, symbolFlag, frontierGold } from '../src/data/frontier.js';
import { decisionStats, battleStats, chronicle, residence, memberStory, entryCategory } from '../src/sim/analytics.js';
import { PERKS, RULES } from '../src/sim/perks.js';
import {
  emptyLegacy, recordLife, parseLegacy, heritageFor, heirCandidates, validHeritage, legacyRecords, lineages, cardCollection,
  perkUnlocked, unlockedPerks, starterChoices, legacyTotals, endingCards, medalsOf, MEDALS, CARD_KINDS,
} from '../src/sim/legacy.js';
import { LEGACY_EVENTS } from '../src/data/legacy-events.js';
import { present, play } from './helpers.js';

const lived = play(createLife({ seed: 'depth-life' }), { until: s => s.ended });

test('every simulated year leaves one history row that the save accepts', () => {
  assert.equal(lived.history.length, lived.age - 1, 'one row per year before the last');
  assert.deepEqual(lived.history.map(r => r.age), Array.from({ length: lived.age - 1 }, (_, i) => i + 1));
  for (const row of lived.history) for (const key of Object.keys(HISTORY_KEYS)) assert.ok(Number.isFinite(row[key]), key);
  assert.equal(series(lived, 'money').length, lived.history.length);
  const high = historyHighlights(lived);
  assert.ok(high.richest.value >= high.poorest.value);
  assert.ok(parseSave(JSON.stringify(lived)));
  const broken = structuredClone(lived); broken.history[3].money = -5;
  assert.equal(parseSave(JSON.stringify(broken)), null);
});

test('companions keep their own records: where they met, battles, evolutions', () => {
  const partner = lived.party.concat(lived.box).find(m => m.origin === 'partner');
  assert.equal(typeof partner.met, 'string');
  assert.ok(partner.battles >= partner.wins);
  const s = createLife({ seed: 'evolve-record', town: 'pallet' }); s.age = 20;
  addPokemon(s, 4, { origin: 'partner', xp: 2000 });
  const { evolveMembers } = { evolveMembers: null };
  const story = memberStory(play(s, { until: x => x.age >= 22 }), 1);
  assert.ok(story.evolutions.length >= 1, 'a high-level Charmander evolves and remembers it');
  assert.equal(story.evolutions[0][1], 4);
});

test('nicknames are trimmed, limited and removable; invalid targets change nothing', () => {
  const s = structuredClone(lived), uid = s.party[0].uid;
  const named = renamePokemon(s, uid, '  번개 꼬마  ');
  assert.equal(named.party[0].nickname, '번개 꼬마');
  assert.equal(s.party[0].nickname, undefined, 'input untouched');
  assert.equal(renamePokemon(named, uid, 'x'.repeat(40)).party[0].nickname.length, NICKNAME_LIMIT);
  assert.equal(renamePokemon(named, uid, '{poke:1}<b>').party[0].nickname, 'poke:1b');
  assert.equal(renamePokemon(named, uid, '').party[0].nickname, undefined);
  assert.equal(renamePokemon(named, 99999, 'x'), named);
  assert.ok(parseSave(JSON.stringify(named)));
  assert.ok(medalsOf(named).includes('nickname'));
});

test('contests: the best-fitting member performs; a win gives a ribbon and opens the next rank', () => {
  const s = createLife({ seed: 'contest', town: 'lilycove' }); s.age = 25; s.encounter = null;
  addPokemon(s, 25, { origin: 'partner', xp: 1500, affection: 90 });
  addPokemon(s, 74, { xp: 100, affection: 20 });
  assert.equal(contestEntrant(s, 'cute').id, 25);
  let wins = 0;
  for (let r = 1; r <= 30; r++) { const t = structuredClone(s); t.rng = r * 104729; runContest(t, { category: 'cute', rank: 0 }); if (t.flags[ribbonFlag('cute', 0)]) { wins++; assert.equal(nextContestRank(t, 'cute'), 1); assert.ok(t.party[0].ribbons.includes('cute-0')); } }
  assert.ok(wins >= 25, `normal rank is winnable for a strong cute partner (${wins}/30)`);
  const event = CONTEST_EVENTS.find(e => e.id === 'contest-hall');
  assert.ok(event.when(s));
  const built = event.build(structuredClone(s));
  for (let i = 0; i < built.choices.length; i++) assert.ok(parseSave(JSON.stringify(choose(present(structuredClone(s), built), i))), `hall choice ${i}`);
  const bad = present(structuredClone(s), { kind: 'choice', title: 't', body: 'b', choices: [{ label: 'x', description: 'd', outcome: 'o', effects: {}, contest: { category: 'dance', rank: 0 } }] });
  assert.equal(parseSave(JSON.stringify(bad)), null, 'unknown contest categories are rejected');
});

test('battle frontier: a pass opens seven facilities; symbols go silver then gold; facility rules gate the series', () => {
  const s = createLife({ seed: 'frontier', town: 'slateport' }); s.age = 30; s.money = 3000; s.encounter = null;
  for (const id of [448, 445, 6]) addPokemon(s, id, { origin: id === 448 ? 'partner' : 'wild', xp: 3000, affection: 90 });
  const tower = FRONTIER_EVENTS.find(e => e.id === 'frontier-tower');
  assert.equal(Boolean(tower.when(s)), false, 'needs the pass');
  s.flags['frontier-pass'] = true;
  const silver = choose(present(structuredClone(s), tower.build(structuredClone(s))), 0);
  assert.ok(silver.flags[symbolFlag('tower', 0)]);
  const gold = choose(present(structuredClone(silver), tower.build(structuredClone(silver))), 0);
  assert.ok(gold.flags[symbolFlag('tower', 1)]);
  assert.equal(Boolean(tower.when(gold)), false, 'closed after gold');
  const palace = FRONTIER_EVENTS.find(e => e.id === 'frontier-palace').build(structuredClone(s));
  assert.ok(palace.choices[0].challenge && palace.choices[0].battle, 'rule check before the battles');
  for (const f of FACILITIES) s.flags[symbolFlag(f.id, 1)] = true;
  assert.equal(frontierGold(s), 7);
  assert.ok(FRONTIER_EVENTS.find(e => e.id === 'frontier-master').when(s));
  assert.ok(parseSave(JSON.stringify(gold)));
});

test('challenge rules change the life: solo keeps one companion, poor starts broke, frail caps the lifespan, wanderer moves', () => {
  const solo = createLife({ seed: 'rules', rules: ['solo'] });
  addPokemon(solo, 25, { origin: 'partner' });
  addPokemon(solo, 16);
  assert.equal(solo.party.length, 1);
  assert.equal(solo.box[0].id, 16);
  assert.equal(movePokemon(solo, solo.box[0].uid), solo, 'cannot bring a second companion');
  addPokemon(solo, 150);
  assert.deepEqual(solo.party.map(m => m.id), [25, 150], 'legendaries still join');
  assert.equal(createLife({ seed: 'rules', rules: ['poor'] }).money, 0);
  assert.ok(createLife({ seed: 'rules-frail', rules: ['frail'] }).lifespan <= 70);
  const wander = play(createLife({ seed: 'rules-wander', rules: ['wanderer'] }), { until: s => s.age >= 32 });
  assert.ok(wander.log.filter(e => e.title === '떠돌이 운명').length >= 3);
  assert.deepEqual(createLife({ seed: 'x', rules: ['solo', 'solo', 'nope'] }).rules, ['solo'], 'rules are cleaned');
  const done = play(createLife({ seed: 'rules-done', rules: ['poor', 'frail'] }), { until: s => s.ended });
  assert.ok(medalsOf(done).includes('rule-poor') && medalsOf(done).includes('rule-frail'));
  assert.ok(endingCards(done).some(c => c.kind === 'rules'));
  assert.ok(parseSave(JSON.stringify(done)));
});

test('perks apply at birth and are limited to known ids and three slots', () => {
  const plain = createLife({ seed: 'perks' });
  const perked = createLife({ seed: 'perks', perks: ['ball-case', 'renowned', 'long-line', 'shiny-charm'] });
  assert.equal(perked.perks.length, 3);
  assert.equal(perked.game.balls, plain.game.balls + 12);
  assert.equal(perked.reputation, plain.reputation + 10);
  assert.equal(perked.lifespan, plain.lifespan + 4);
  const starter = createLife({ seed: 'perks', starter: 133 });
  const six = play(starter, { until: s => s.age >= 6 && !s.encounter && !s.pending });
  assert.equal(six.party.find(m => m.origin === 'partner').id, 133);
  assert.equal(createLife({ seed: 'perks', starter: 150 }).starter, null, 'no legendary starters');
  for (const bad of [{ perks: ['nope'] }, { perks: ['ball-case', 'ball-case'] }, { rules: ['nope'] }, { starter: 150 }])
    assert.equal(parseSave(JSON.stringify({ ...perked, ...bad })), null);
  assert.equal(Object.keys(PERKS).length, 9);
  assert.equal(Object.keys(RULES).length, 5);
});

test('v4 saves migrate to v5 with empty history and no perks or rules', () => {
  const old = structuredClone(lived);
  old.version = 4; delete old.history; delete old.perks; delete old.rules; delete old.starter;
  for (const m of [...old.party, ...old.box]) { delete m.battles; delete m.wins; delete m.met; delete m.evolutions; delete m.ribbons; }
  const migrated = parseSave(JSON.stringify(old));
  assert.equal(migrated.version, VERSION);
  assert.deepEqual([migrated.history, migrated.perks, migrated.rules, migrated.starter], [[], [], [], null]);
  assert.ok(memberStory(migrated, migrated.party[0].uid), 'old members without records still have a story');
});

test('analytics summarise decisions, battles, places and the chronicle', () => {
  const stats = decisionStats(lived);
  assert.ok(stats.decisions > 20);
  assert.equal(stats.byTone.reduce((n, t) => n + t.count, 0), stats.resolved);
  assert.ok(stats.byCategory.every(c => c.label && c.count > 0));
  assert.ok(stats.byCategory.reduce((n, c) => n + c.count, 0) === stats.decisions);
  assert.ok(stats.checks.attempted >= stats.checks.succeeded);
  const b = battleStats(lived);
  assert.ok(b.battles >= b.wins);
  const places = residence(lived);
  assert.equal(places.regions.reduce((n, r) => n + r.years, 0), lived.history.length);
  const news = chronicle(lived);
  assert.ok(news.length > 10 && news[0].age >= news.at(-1).age, 'newest first');
  assert.ok(chronicle(lived, { region: 'kanto' }).length <= news.length);
  assert.ok(lived.log.filter(e => e.choices).every(e => entryCategory(e) !== undefined));
});

test('the legacy keeps running totals, records, lineages, card collections and perk unlocks', () => {
  let legacy = recordLife(emptyLegacy(), lived);
  assert.equal(legacy.totals.lives, 1);
  assert.equal(legacy.totals.years, lived.age);
  assert.ok(unlockedPerks(legacy).every(id => PERKS[id]));
  assert.equal(perkUnlocked(legacy, 'town-pass'), false);
  const heritage = heritageFor(lived, heirCandidates(lived)[0].uid);
  assert.ok(validHeritage(heritage));
  const child = play(createLife({ seed: 'depth-child', heritage }), { until: s => s.ended });
  legacy = recordLife(legacy, child);
  assert.equal(perkUnlocked(legacy, 'town-pass'), true, 'two finished lives open the birthplace choice');
  const chains = lineages(legacy);
  assert.equal(chains.length, 1);
  assert.deepEqual(chains[0].map(l => l.name), [lived.name, child.name]);
  const records = legacyRecords(legacy);
  assert.equal(records.find(r => r.id === 'oldest').best.value, Math.max(lived.age, child.age));
  const cards = cardCollection(legacy);
  assert.ok(cards.epitaph.copies === 2);
  assert.ok(Object.keys(cards).every(kind => CARD_KINDS[kind]), 'every collected kind is in the catalog');
  assert.ok(starterChoices(legacy).length > 0);
  // Stores written before running totals existed get them rebuilt.
  const old = structuredClone(legacy); delete old.totals;
  assert.equal(parseLegacy(JSON.stringify(old)).totals.lives, 2);
  const totals = legacyTotals(legacy);
  assert.equal(totals.medalTotal, MEDALS.length);
  assert.ok(MEDALS.length >= 70);
  assert.equal(new Set(MEDALS.map(m => m.id)).size, MEDALS.length);
});

test('the ancestor’s partner and rival can appear in the next generation', () => {
  const heritage = heritageFor(lived, heirCandidates(lived)[0].uid);
  assert.ok(heritage.partner, 'the ancestor kept a non-legendary first partner');
  const base = play(createLife({ seed: 'depth-heir', heritage }), { until: s => s.age >= 13 && !s.pending && !s.encounter && !s.scheduledEvent });
  const visit = LEGACY_EVENTS.find(e => e.id === 'heritage-old-partner');
  const fresh = structuredClone(base); fresh.used = fresh.used.filter(id => id !== visit.id);
  assert.ok(visit.when(fresh));
  const after = choose(present(structuredClone(fresh), visit.build(structuredClone(fresh))), 0);
  assert.ok([...after.party, ...after.box].some(m => m.id === heritage.partner.id && m.origin === 'gift' && m.affection === 70));
  assert.ok(after.flags['heritage-old-partner']);
  assert.ok(parseSave(JSON.stringify(after)));
  assert.equal(validHeritage({ ...heritage, partner: { id: 150, level: 50 } }), false, 'no legendary partners handed down');
});
