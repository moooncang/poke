import { TOWNS } from '../data/world.js';
import { POKE_TOKEN, josa } from '../sim/text.js';
import { partnerOf } from '../engine.js';
import { POKEMON } from './assets.js';

export const pokemonName = id => POKEMON[id]?.name || `#${id}`;

/** Resolves {town}, {partner} and {poke:id|particle} tokens in simulation text. */
export function formatText(text, life, entry) {
  const town = TOWNS.find(t => t.id === (entry?.town || life.town))?.name || '';
  const partner = pokemonName(entry?.partnerId || partnerOf(life)?.id) || '파트너';
  return String(text ?? '')
    .replaceAll('{town}', town)
    .replaceAll('{partner}', partner)
    .replace(POKE_TOKEN, (_, id, withFinal, withoutFinal) => withFinal !== undefined ? josa(pokemonName(id), withFinal, withoutFinal) : pokemonName(id));
}
