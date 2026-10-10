#!/usr/bin/env python3
"""Build Korean-first, provenance-preserving indexes from the downloaded CSVs."""
import csv
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'resources'
CSV = ROOT / 'raw/pokeapi/data/v2/csv'
OUT = ROOT / 'catalog'


def rows(name):
    with (CSV / (name + '.csv')).open(newline='', encoding='utf-8') as f:
        yield from csv.DictReader(f)


def names(table, key, language='3'):
    return {int(r[key]): r for r in rows(table) if r['local_language_id'] == language}


def number(value):
    return int(value) if value else None


def write(name, data):
    (OUT / (name + '.json')).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    ko = names('pokemon_species_names', 'pokemon_species_id')
    en = names('pokemon_species_names', 'pokemon_species_id', '9')
    defaults = {int(r['species_id']): r for r in rows('pokemon') if r['is_default'] == '1'}
    all_pokemon = {int(r['id']): int(r['species_id']) for r in rows('pokemon')}
    types = defaultdict(list)
    type_ko = names('type_names', 'type_id')
    for r in rows('pokemon_types'):
        types[int(r['pokemon_id'])].append({'id': int(r['type_id']), 'name_ko': type_ko.get(int(r['type_id']), {}).get('name', '').strip(), 'slot': int(r['slot'])})
    flavors = defaultdict(dict)
    english_flavors = defaultdict(dict)
    flavor_count = 0
    for r in rows('pokemon_species_flavor_text'):
        if r['language_id'] == '3':
            flavor_count += 1
            text = ' '.join(r['flavor_text'].split())
            flavors[int(r['species_id'])].setdefault(text, []).append(int(r['version_id']))
        elif r['language_id'] == '9':
            text = ' '.join(r['flavor_text'].split())
            english_flavors[int(r['species_id'])].setdefault(text, []).append(int(r['version_id']))
    evolution = defaultdict(list)
    for r in rows('pokemon_evolution'):
        evolution[int(r['evolved_species_id'])].append(r)
    pokemon = []
    for r in rows('pokemon_species'):
        i = int(r['id']); default = defaults[i]
        assets = {kind: f'assets/pokemon/{kind}/{i}.png' for kind in ('front', 'shiny', 'artwork', 'back')}
        assets = {kind: path if (ROOT / path).is_file() else None for kind, path in assets.items()}
        pokemon.append({'id': i, 'slug': r['identifier'], 'name_ko': ko.get(i, {}).get('name'),
                        'name_en': en.get(i, {}).get('name'), 'genus_ko': ko.get(i, {}).get('genus'),
                        'generation_id': int(r['generation_id']), 'habitat_id': number(r['habitat_id']),
                        'evolves_from_species_id': number(r['evolves_from_species_id']),
                        'evolution_chain_id': int(r['evolution_chain_id']),
                        'is_legendary': r['is_legendary'] == '1', 'is_mythical': r['is_mythical'] == '1',
                        'is_baby': r['is_baby'] == '1', 'height_m': int(default['height']) / 10,
                        'weight_kg': int(default['weight']) / 10, 'types': types[int(default['id'])],
                        'flavor_texts_ko': [{'text': text, 'version_ids': versions} for text, versions in flavors[i].items()],
                        'flavor_texts_en': [{'text': text, 'version_ids': versions} for text, versions in english_flavors[i].items()],
                        'preferred_flavor_language': 'ko' if flavors[i] else 'en',
                        'evolution_rules_raw': evolution[i], 'assets': assets})
    write('pokemon', pokemon)

    region_ko = names('region_names', 'region_id')
    regions = [{'id': int(r['id']), 'slug': r['identifier'], 'name_ko': region_ko.get(int(r['id']), {}).get('name')}
               for r in rows('regions')]
    write('regions', regions)
    location_ko = names('location_names', 'location_id')
    location_en = names('location_names', 'location_id', '9')
    locations = [{'id': int(r['id']), 'slug': r['identifier'], 'region_id': number(r['region_id']),
                  'name_ko': location_ko.get(int(r['id']), {}).get('name'),
                  'name_en': location_en.get(int(r['id']), {}).get('name')}
                 for r in rows('locations')]
    write('locations', locations)
    by_slug = {r['slug']: r for r in locations}
    area_locations = {int(r['id']): int(r['location_id']) for r in rows('location_areas')}
    encounters = defaultdict(lambda: {'species_ids': set(), 'version_ids': set(), 'source_rows': 0})
    for r in rows('encounters'):
        entry = encounters[area_locations[int(r['location_area_id'])]]
        entry['species_ids'].add(all_pokemon[int(r['pokemon_id'])])
        entry['version_ids'].add(int(r['version_id']))
        entry['source_rows'] += 1
    write('encounters-by-location', [{'location_id': i, 'species_ids': sorted(r['species_ids']),
                                      'version_ids': sorted(r['version_ids']), 'source_rows': r['source_rows']}
                                     for i, r in sorted(encounters.items())])

    item_ko = names('item_names', 'item_id')
    items = []
    for r in rows('items'):
        path = f'assets/items/{r["identifier"]}.png'
        items.append({'id': int(r['id']), 'slug': r['identifier'], 'name_ko': item_ko.get(int(r['id']), {}).get('name'),
                      'category_id': int(r['category_id']), 'sprite': path if (ROOT / path).exists() else None})
    write('items', items)
    nature_ko = names('nature_names', 'nature_id')
    write('natures', [{**r, 'name_ko': nature_ko.get(int(r['id']), {}).get('name')} for r in rows('natures')])

    maps = []
    for source in ('pokefirered', 'pokeemerald'):
        for p in sorted((ROOT / 'raw' / source / 'data/maps').glob('*/map.json')):
            r = json.loads(p.read_text())
            slug = r['region_map_section'].removeprefix('MAPSEC_').lower().replace('_', '-')
            loc = by_slug.get(slug)
            maps.append({'source': source, 'id': r['id'], 'name': r['name'], 'map_type': r['map_type'],
                         'region_map_section': r['region_map_section'],
                         'pokeapi_location_id': loc['id'] if loc else None,
                         'name_ko': loc['name_ko'] if loc else None,
                         'connections': r.get('connections') or [], 'weather': r.get('weather'),
                         'npc_count': len(r.get('object_events') or []), 'raw_path': str(p.relative_to(ROOT))})
    write('maps', maps)
    summary = {
        'pokemon_species': len(pokemon), 'pokemon_korean_names': sum(bool(p['name_ko']) for p in pokemon),
        'pokemon_with_korean_flavor': sum(bool(p['flavor_texts_ko']) for p in pokemon),
        'korean_flavor_rows': flavor_count, 'korean_flavor_unique_per_species': sum(len(p['flavor_texts_ko']) for p in pokemon),
        'regions': len(regions), 'regions_with_korean_names': sum(bool(r['name_ko']) for r in regions),
        'locations': len(locations), 'locations_with_korean_names': sum(bool(r['name_ko']) for r in locations),
        'locations_with_encounters': len(encounters), 'encounter_rows': sum(r['source_rows'] for r in encounters.values()),
        'items': len(items), 'items_with_sprites': sum(bool(r['sprite']) for r in items),
        'map_records': len(maps), 'town_city_maps': sum(r['map_type'] in ('MAP_TYPE_TOWN', 'MAP_TYPE_CITY') for r in maps),
        'pokemon_images': {kind: sum(bool(p['assets'][kind]) for p in pokemon) for kind in ('front', 'shiny', 'artwork', 'back')},
        'csv_files': len(list(CSV.glob('*.csv'))),
    }
    write('summary', summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
