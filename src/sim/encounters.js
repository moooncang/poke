import { EVOLUTIONS, LEGENDARY } from '../data/species-rules.js';
import { TOWNS } from '../data/world.js';
import { pick } from './random.js';

const parents = new Map();
for (const [id, targets] of Object.entries(EVOLUTIONS)) for (const [target] of targets) parents.set(target, Number(id));
export function evolutionFamily(id) {
  while (parents.has(id)) id = parents.get(id);
  return id;
}

// Existing saves need no migration: current party + box retain every captured family after evolution.
export function selectWildEncounter(s) {
  const home = TOWNS.find(t => t.id === s.town);
  const owned = new Set([...s.party, ...s.box].map(m => evolutionFamily(m.id)));
  const recent = new Set(s.log.slice(-100).flatMap(e => (e.choices || []).flatMap(c => c.battle?.capture ? [c.battle.opponent] : c.captureJoin ? [c.captureJoin] : [])));
  const scopes = [[home], TOWNS.filter(t => t.map === home.map), TOWNS];
  for (const towns of scopes) {
    const candidates = [...new Set(towns.flatMap(t => t.pool))].filter(id => !LEGENDARY.has(id) && !owned.has(evolutionFamily(id)));
    if (!candidates.length) continue;
    const fresh = candidates.filter(id => !recent.has(id));
    const id = pick(s, fresh.length ? fresh : candidates);
    const habitat = towns.find(t => t.pool.includes(id));
    return { id, habitat, observation: false };
  }
  return { id: pick(s, home.pool), habitat: home, observation: true };
}
