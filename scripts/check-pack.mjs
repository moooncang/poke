// Validates an event pack before it is registered in the director.
//   node scripts/check-pack.mjs <module path> <export name> [storylets|vignettes]
// Storylets: every row must be reachable in some staged state (any town × career × age), build a complete event
// with at least one free option, resolve all tokens, keep Korean particles sane, and keep the save valid after
// every choice. Vignettes: rows must use supported tokens only.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createLife, choose, parseSave } from '../src/engine.js';
import { TOWNS, CAREERS } from '../src/data/world.js';
import { CONDITIONS } from '../src/sim/world.js';
import { addPokemon } from '../src/sim/party.js';
import { POKE_TOKEN } from '../src/sim/text.js';
import { CONSEQUENCES } from '../src/data/consequences.js';
import { fill } from '../src/data/event-kit.js';
import { play, present } from '../tests/helpers.js';

const [file, name, kind = 'storylets'] = process.argv.slice(2);
if (!file || !name) { console.error('usage: node scripts/check-pack.mjs <module> <export> [storylets|vignettes]'); process.exit(2); }
const mod = await import(pathToFileURL(resolve(file)).href);
const rows = mod[name];
if (!Array.isArray(rows)) { console.error(`${name} is not an exported array`); process.exit(2); }

const errors = [], warnings = [];
const ids = rows.map(r => r.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length) errors.push(`duplicate ids in pack: ${[...new Set(dupes)].join(', ')}`);
const { ALL_STORYLETS } = await import('../src/sim/director.js');
const { VIGNETTES } = await import('../src/data/vignettes.js');
const existing = new Set([...ALL_STORYLETS.map(s => s.id), ...VIGNETTES.map(v => v.id)]);
const clash = ids.filter(id => existing.has(id) && !ALL_STORYLETS.concat(VIGNETTES).some(s => s === rows.find(r => r.id === id)));
if (clash.length) errors.push(`ids already used elsewhere: ${clash.join(', ')}`);

// Doubled or mismatched particles that josa()/poke() would have prevented.
const BAD_TEXT = /\{(friend|rival|spouse|sibling|region|villain|pk|partner\|)[^}]*\}|undefined|NaN|\[object|을를|를을|은는|는은|과와|와과|으로로|를를|을을/;

if (kind === 'vignettes') {
  for (const v of rows) {
    if (!(v.id && Number.isInteger(v.min) && Number.isInteger(v.max) && v.title && v.body && v.effects)) errors.push(`${v.id}: incomplete row`);
    if (/\{(?!town\}|(partner|friend|spouse|rival|sibling)(\}|\|[^|}]+\|[^}]+\}))[^}]*\}/.test(v.body)) errors.push(`${v.id}: unsupported token in body`);
    if (v.when && typeof v.when !== 'function') errors.push(`${v.id}: when must be a function`);
  }
} else {
  const cache = {};
  const lifeAt = age => cache[age] ||= play(createLife({ seed: 'pack-check' }), { until: s => s.age >= age && !s.pending && !s.encounter && !s.scheduledEvent });
  // Searching uses a copy with a short log (conditions rarely read the log); the full life is used to build and apply.
  const light = {};
  const lightAt = age => light[age] ||= { ...lifeAt(age), log: lifeAt(age).log.slice(-30), memories: [] };
  function staged(age, townId, career, married, full = false) {
    const s = structuredClone(full ? lifeAt(age) : lightAt(age));
    Object.assign(s, { town: townId, career, money: 6000, reputation: 50 });
    if (!s.visited.includes(townId)) s.visited.push(townId);
    s.work = { years: 3, satisfaction: 50, cut: 0, retired: false };
    s.relationship = married ? { ...s.relationship, status: 'married', marriedAt: Math.max(19, s.age - 1), children: 1 } : { ...s.relationship, status: 'single', children: 0 };
    s.world.conditions = Object.keys(CONDITIONS).map(id => ({ id, region: TOWNS.find(t => t.id === townId).map, since: s.age, until: s.age + 3 }));
    while (s.party.length < 4) addPokemon(s, [25, 7, 92, 66][s.party.length], { xp: 900 });
    while (s.box.length < 2) addPokemon(s, 16);
    return s;
  }
  // Extra pokemon of every type, so type-gated events can open.
  const TYPE_SPECIES = [1, 4, 7, 10, 16, 19, 23, 25, 27, 35, 41, 50, 56, 63, 66, 74, 81, 92, 95, 104, 111, 123, 124, 131, 133, 147, 198, 208, 228, 302, 303, 374, 447];
  // Party variants that together cover every type (members are written directly; this is only a reachability probe).
  const GROUPS = Array.from({ length: Math.ceil(TYPE_SPECIES.length / 5) }, (_, i) => TYPE_SPECIES.slice(i * 5, i * 5 + 5));
  const richen = (s, group) => {
    const rich = structuredClone(s);
    const keep = rich.party.filter(m => m.origin === 'partner' || m.locked).slice(0, 1);
    rich.box.push(...rich.party.filter(m => !keep.includes(m)));
    rich.party = keep;
    for (const id of GROUPS[group]) { rich.nextUid += 1; rich.party.push({ uid: rich.nextUid, id, joined: rich.age, shiny: false, xp: 900, affection: 50, origin: 'wild' }); if (!rich.seen.includes(id)) rich.seen.push(id); }
    if (rich.partyPlan) rich.partyPlan = { ...rich.partyPlan, pinned: [] };
    return rich;
  };
  let reached = 0;
  for (const storylet of rows) {
    if (typeof storylet.build !== 'function') { errors.push(`${storylet.id}: no build()`); continue; }
    if (!storylet.category) errors.push(`${storylet.id}: no category`);
    let state, found;
    const ages = [...new Set([Math.max(storylet.min ?? 0, 6), Math.min(storylet.max ?? 90, 30), Math.min(storylet.max ?? 90, 60)])].filter(a => a >= (storylet.min ?? 0) && a <= (storylet.max ?? 120));
    // Plain staged states first; the expensive "every type in the party" variant only if nothing opened.
    search: for (const rich of [-1, ...GROUPS.keys()]) for (const age of ages) for (const town of TOWNS) for (const career of [null, ...Object.keys(CAREERS)]) for (const married of [false, true]) {
      const base = staged(age, town.id, career, married), s = rich >= 0 ? richen(base, rich) : base;
      if (!s.ended && (!storylet.when || storylet.when(s))) { found = [age, town.id, career, married, rich]; break search; }
    }
    if (found) {
      const [age, townId, career, married, rich] = found;
      const full = staged(age, townId, career, married, true);
      state = rich >= 0 ? richen(full, rich) : full;
    }
    if (!state) { warnings.push(`${storylet.id}: not reachable in staged states (needs flags/earlier stages?)`); continue; }
    reached++;
    let event;
    try { event = storylet.build(structuredClone(state)); } catch (e) { errors.push(`${storylet.id}: build threw ${e.message}`); continue; }
    if (!event?.title || !event?.body || !event.choices?.length) { errors.push(`${storylet.id}: incomplete event`); continue; }
    const text = JSON.stringify(event).replace(POKE_TOKEN, '');
    if (BAD_TEXT.test(text)) errors.push(`${storylet.id}: bad text ${text.match(BAD_TEXT)[0]}`);
    if (!event.choices.some(c => !c.cost)) errors.push(`${storylet.id}: no free option`);
    if (event.choices.length > 8) errors.push(`${storylet.id}: more than 8 choices`);
    event.choices.forEach((c, i) => {
      if (!(c.label && c.description && c.outcome)) errors.push(`${storylet.id}#${i}: label/description/outcome missing`);
      for (const f of [...(c.follow || []), ...(c.challenge?.failure?.follow || []), ...Object.values(c.after || {}).flatMap(a => a.follow || [])])
        if (!CONSEQUENCES[f.id]) errors.push(`${storylet.id}#${i}: unknown follow ${f.id}`);
      const after = choose(present(structuredClone(state), structuredClone(event)), i);
      if (after.pending) errors.push(`${storylet.id}#${i}: cannot be chosen`);
      else if (!parseSave(JSON.stringify(after))) errors.push(`${storylet.id}#${i}: save becomes invalid`);
    });
  }
  console.log(`reached ${reached}/${rows.length}`);
}

for (const w of warnings) console.log('WARN ', w);
for (const e of errors) console.log('ERROR', e);
console.log(`${rows.length} rows · ${errors.length} errors · ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
