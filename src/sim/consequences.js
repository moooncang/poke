// Delayed consequences. A choice can plant `follow` seeds; years later each seed turns into either
// a decision (`type: 'choice'`, competes for the year's main event) or an automatic "echo" record.
import { CONSEQUENCES } from '../data/consequences.js';
import { chance, between } from './random.js';
import { josa } from './text.js';

export function plantSeeds(s, follow = [], origin) {
  for (const { id, delay = [2, 5], p = 1, data = {} } of follow) {
    if (!CONSEQUENCES[id] || !chance(s, p)) continue;
    s.seeds.push({ id, at: s.age + between(s, delay[0], delay[1]), origin: { age: origin.age, title: origin.title, label: origin.label }, data });
  }
}

const ready = (s, seed) => seed.at <= s.age && (!CONSEQUENCES[seed.id].when || Boolean(CONSEQUENCES[seed.id].when(s, seed)));
const expired = (s, seed) => s.age > seed.at + 5;

function build(s, seed) {
  const event = CONSEQUENCES[seed.id].build(s, seed);
  if (!event) return null;
  const echo = { age: seed.origin.age, title: seed.origin.title, label: seed.origin.label };
  return { ...event, echo, sourceId: null, body: `${s.age - seed.origin.age}년 전 「${seed.origin.title}」에서 ‘${seed.origin.label}’${josa(seed.origin.label, '을', '를').slice(seed.origin.label.length)} 골랐다. ${event.body}` };
}

/** Resolves all due echo seeds into journal records and drops seeds that can no longer happen. */
export function resolveEchoes(s) {
  const records = [];
  s.seeds = s.seeds.filter(seed => {
    const rule = CONSEQUENCES[seed.id];
    if (rule.type !== 'echo' || !ready(s, seed)) return !expired(s, seed);
    const event = build(s, seed);
    if (event) records.push({ kind: 'echo', automatic: true, effects: {}, ...event });
    return false;
  });
  return records;
}

/** Takes the earliest due decision seed, if any, and returns its event. */
export function takeDueChoice(s) {
  const index = s.seeds.findIndex(seed => CONSEQUENCES[seed.id].type === 'choice' && ready(s, seed));
  if (index < 0) return null;
  const [seed] = s.seeds.splice(index, 1);
  return build(s, seed);
}
