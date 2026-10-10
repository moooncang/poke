// Deterministic randomness. All simulation rolls go through `state.rng` so a save always replays identically.
export function hashSeed(value) {
  let hash = 2166136261;
  for (const char of String(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0 || 1;
}

export function random(state) {
  state.rng = (Math.imul(state.rng, 1664525) + 1013904223) >>> 0;
  return state.rng / 4294967296;
}

export const pick = (state, values) => values[Math.floor(random(state) * values.length)];
export const chance = (state, probability) => random(state) < probability;
export const between = (state, min, max) => min + Math.floor(random(state) * (max - min + 1));
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Picks one entry proportionally to its weight. Entries with a weight of 0 or less are never chosen.
export function weighted(state, entries, weightOf = entry => entry.weight) {
  const scored = entries.map(entry => [entry, Math.max(0, weightOf(entry) || 0)]).filter(([, w]) => w > 0);
  const total = scored.reduce((sum, [, w]) => sum + w, 0);
  if (!total) return null;
  let roll = random(state) * total;
  for (const [entry, w] of scored) if ((roll -= w) < 0) return entry;
  return scored.at(-1)[0];
}
