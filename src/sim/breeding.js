import { EGG_GROUPS, BREEDING_SPECIES } from '../data/breeding-rules.js';
import { evolutionFamily } from './encounters.js';
import { hashSeed } from './random.js';
import { isLegendary } from './party.js';

// Stable individual sex, derived from the saved UID instead of adding a save field.
export function breedingSex(s, member) {
  const rate = BREEDING_SPECIES[member.id]?.[0] ?? -1;
  if (rate < 0) return 'genderless';
  return hashSeed(`${s.seed}:sex:${member.uid}`) % 8 < rate ? 'female' : 'male';
}
export function offspringFor(s, a, b) {
  if (a.uid === b.uid || isLegendary(a.id) || isLegendary(b.id)) return null;
  const ga = EGG_GROUPS[a.id] || [15], gb = EGG_GROUPS[b.id] || [15];
  if (ga.includes(15) || gb.includes(15) || (a.id === 132 && b.id === 132)) return null;
  let parent;
  if (a.id === 132 || b.id === 132) parent = a.id === 132 ? b : a;
  else {
    const sa = breedingSex(s, a), sb = breedingSex(s, b);
    if (sa === sb || sa === 'genderless' || sb === 'genderless' || !ga.some(g => gb.includes(g))) return null;
    parent = sa === 'female' ? a : b;
  }
  // Nidoran and Volbeat/Illumise are special paired species; use a stable family result.
  const root = evolutionFamily(parent.id);
  return [29,32].includes(root) ? (hashSeed(`${s.seed}:${a.uid}:${b.uid}`) % 2 ? 29 : 32)
    : [313,314].includes(root) ? (hashSeed(`${s.seed}:${a.uid}:${b.uid}`) % 2 ? 313 : 314) : root;
}
export function breedingPairs(s) {
  const members = [...s.party, ...s.box];
  const pairs = [];
  for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) {
    const a = members[i], b = members[j], child = offspringFor(s, a, b);
    if (child) pairs.push({ a, b, child });
  }
  return pairs.sort((x, y) => (y.a.affection + y.b.affection) - (x.a.affection + x.b.affection) || x.a.uid - y.a.uid || x.b.uid - y.b.uid);
}
