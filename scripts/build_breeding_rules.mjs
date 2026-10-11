import { writeFile } from 'node:fs/promises';
const commit = 'c80757193bd0889054e36f4209762360bdaa4b95';
const base = `https://raw.githubusercontent.com/PokeAPI/pokeapi/${commit}/data/v2/csv/`;
async function csv(name) {
 const response = await fetch(`${base}${name}.csv`);
 if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
 const [header,...lines] = (await response.text()).trim().split('\n').map(line=>line.replace(/\r$/,'').split(','));
 return lines.map(row=>Object.fromEntries(header.map((key,i)=>[key,row[i]])));
}
const groups = {}, species = {};
for (const row of await csv('pokemon_egg_groups')) if (+row.species_id <= 1025) (groups[row.species_id] ||= []).push(+row.egg_group_id);
for (const row of await csv('pokemon_species')) if (+row.id <= 1025) species[row.id] = [+row.gender_rate,+row.is_baby];
await writeFile(new URL('../src/data/breeding-rules.js',import.meta.url), `// Generated from PokéAPI ${commit}; see resources/SOURCES.md.\n// Groups: 13 Ditto, 15 Undiscovered. Species: [gender_rate, is_baby].\nexport const EGG_GROUPS = ${JSON.stringify(groups)};\nexport const BREEDING_SPECIES = ${JSON.stringify(species)};\n`);
