// Compact authoring helpers for table-driven storylets.
//
// A row is [id, min, max, title, body, options, meta?]; an option is [label, tone, effects, outcome, extra?].
// `extra` may be an object or a function of the state (evaluated when the event is built). Descriptions are
// generated from the option's effects unless `extra.description` is given. A non-check option that loses money
// automatically gets a matching `cost` so it cannot be chosen without the money.
import { TOWNS } from './world.js';
import { REGIONS } from './regions.js';
import { EFFECT_LABELS, STAT_LABELS } from '../sim/labels.js';
import { WORLD_KEYS, currentRegion } from '../sim/world.js';
import { pick } from '../sim/random.js';
import { josa, poke } from '../sim/text.js';
import { partnerOf } from '../sim/party.js';

export const town = s => TOWNS.find(t => t.id === s.town);
export const region = s => REGIONS.find(r => r.id === currentRegion(s));
export const localSpecies = s => pick(s, town(s).pool);
export const farTown = s => pick(s, TOWNS.filter(t => t.map !== currentRegion(s)));
export const working = s => Boolean(s.career) && !s.work.retired;

/** Failure branch of a stat check. */
export const check = (stat, difficulty, outcome, effects = {}, more = {}) => ({ challenge: { stat, difficulty, failure: { outcome, effects, ...more } } });
/** A delayed consequence. */
export const later = (id, delay, p = 1, data = {}) => ({ id, delay, p, data });
/**
 * A delayed automatic record written inline, without adding to consequences.js. Text may use the {friend}… tokens;
 * they are filled when the record arrives.
 */
export const echoLater = (delay, title, body, effects = {}, p = 1) => later('pack-echo', delay, p, { title, body, effects });
/**
 * A delayed decision written inline. `rows` use the same option format as table rows; `extra` must be a plain
 * object (not a function) because it is stored in the save until the decision arrives.
 */
export const choiceLater = (delay, title, body, rows, p = 1) => later('pack-choice', delay, p, { title, body, rows });

// {friend}, {rival}, {sibling}, {spouse}, {region}, {villain}, optionally with a particle: {friend|이|가}.
// {partner|이|가} becomes a species token (the plain {partner} is left for the UI).
const NAME = /\{(friend|rival|sibling|spouse|region|villain)(?:\|([^|}]*)\|([^}]*))?\}/g;
const PARTNER = /\{partner\|([^|}]*)\|([^}]*)\}/g;
export function fill(s, text) {
  const partner = partnerOf(s);
  text = text.replace(PARTNER, (_, withFinal, withoutFinal) => partner ? poke(partner.id, withFinal, withoutFinal) : josa('파트너', withFinal, withoutFinal));
  const names = { friend: s.cast.friend.name, rival: s.cast.rival.name, sibling: s.cast.sibling?.name || '형제',
    spouse: s.relationship.name, region: `${region(s).name}지방`, villain: region(s).villain };
  return text.replace(NAME, (_, key, withFinal, withoutFinal) => withFinal !== undefined ? josa(names[key], withFinal, withoutFinal) : names[key]);
}

function describe(choice) {
  const parts = [];
  if (choice.challenge) parts.push(`${STAT_LABELS[choice.challenge.stat]} 판정`);
  if (choice.challenge && choice.cost) parts.push(`${choice.cost}P`);
  for (const [key, value] of Object.entries(choice.effects || {})) if (value) parts.push(`${EFFECT_LABELS[key]} ${value > 0 ? '+' : ''}${value}${key === 'money' ? 'P' : ''}`);
  for (const [key, value] of Object.entries(choice.world || {})) parts.push(`지방 ${WORLD_KEYS[key]} ${value > 0 ? '+' : ''}${value}`);
  if (choice.training) parts.push(`파티 경험치 +${choice.training}`);
  if (choice.affection) parts.push(`파티 친밀도 ${choice.affection > 0 ? '+' : ''}${choice.affection}`);
  if (choice.join || choice.captureJoin) parts.push('포켓몬 합류');
  if (choice.observe) parts.push('도감 등록');
  if (choice.battle) parts.push('자동 배틀');
  return parts.slice(0, 5).join(' · ') || '큰 변화 없음';
}

export function option(s, [label, tone, effects, outcome, extra = {}]) {
  const more = typeof extra === 'function' ? extra(s) : extra;
  const choice = { label: fill(s, label), tone, effects: { ...effects }, outcome: fill(s, outcome), ...more };
  if (!choice.challenge && (choice.effects.money || 0) < 0 && choice.cost === undefined) choice.cost = -choice.effects.money;
  if (choice.challenge) choice.challenge.failure.outcome = fill(s, choice.challenge.failure.outcome);
  choice.description = more.description ? fill(s, more.description) : describe(choice);
  return choice;
}

/** Turns table rows into storylets of one category. */
export const table = (category, rows) => rows.map(([id, min, max, title, body, options, meta = {}]) => ({
  id, category, min, max, ...meta,
  build: s => ({ kind: 'choice', title: fill(s, title), body: fill(s, typeof body === 'function' ? body(s) : body), choices: options.map(o => option(s, o)) }),
}));
