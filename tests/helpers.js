import { createLife, advance, acknowledge, choose, autoChoice } from '../src/engine.js';

/** Plays a life forward. `decide(state)` returns a choice index (falls back to the character's own choice). */
export function play(state, { until = s => s.ended, decide = null, max = 8000 } = {}) {
  let s = state, steps = 0;
  while (!until(s) && !s.ended && steps++ < max) {
    if (s.encounter) s = acknowledge(s);
    else if (s.pending) { const next = decide ? choose(s, decide(s)) : s; s = next === s ? autoChoice(s) : next; }
    else s = advance(s);
  }
  return s;
}

export const lifeAt = (age, seed = 'garden', town = 'pallet') => play(createLife({ seed, town }), { until: s => s.age >= age && !s.scheduledEvent });

/** Puts an event in front of the player as the pending decision. */
export function present(s, event) {
  const entry = { kind: 'choice', effects: {}, ...event, id: `test-${s.log.length}`, age: s.age, season: 0, town: s.town, partnerId: null };
  s.log.push(entry);
  s.pending = entry.id;
  delete s.scheduledEvent;
  s.encounter = null;
  return s;
}
