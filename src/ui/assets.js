import pokemon from '../data/pokemon.json';

export const POKEMON = Object.fromEntries(pokemon.map(p => [p.id, p]));
export const asset = path => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
export const sprite = (id, shiny = false) => asset(`assets/pokemon/${shiny ? 'shiny' : 'front'}/${id}.png`);
export const artwork = id => asset(`assets/pokemon/artwork/${id}.png`);
export const icon = (id, size = 16) => asset(`assets/icons/${id}${size === 24 || size === 32 ? `@${size}` : ''}.png`);
