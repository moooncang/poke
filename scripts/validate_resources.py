#!/usr/bin/env python3
"""Validate actual bytes, decoded PNGs and the useful catalog relationships."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'resources'


def load(name):
    return json.loads((ROOT / name).read_text())


def main():
    manifest = load('manifest.json')
    images = 0
    for record in manifest['files']:
        path = ROOT / record['path']
        data = path.read_bytes()
        assert len(data) == record['bytes'], path
        assert hashlib.sha256(data).hexdigest() == record['sha256'], path
        if path.suffix == '.png':
            with Image.open(path) as im:
                im.load()
                assert im.width > 0 and im.height > 0, path
            images += 1
    pokemon = load('catalog/pokemon.json')
    ids = {p['id'] for p in pokemon}
    assert len(ids) == len(pokemon) == 1025
    for p in pokemon:
        assert p['name_ko'] and p['flavor_texts_en'], p['id']
        assert p['evolves_from_species_id'] is None or p['evolves_from_species_id'] in ids
        for kind in ('front', 'shiny', 'artwork'):
            assert p['assets'][kind] and (ROOT / p['assets'][kind]).is_file(), (p['id'], kind)
        if p['id'] <= 251:
            assert p['assets']['back'] and (ROOT / p['assets']['back']).is_file(), p['id']
    locations = {r['id'] for r in load('catalog/locations.json')}
    for entry in load('catalog/encounters-by-location.json'):
        assert entry['location_id'] in locations
        assert set(entry['species_ids']) <= ids
    maps = load('catalog/maps.json')
    map_ids = {(m['source'], m['id']) for m in maps}
    for m in maps:
        assert (ROOT / m['raw_path']).is_file()
        for connection in m['connections']:
            assert (m['source'], connection['map']) in map_ids, (m['id'], connection)
    derived = load('catalog/derived-maps.json')
    for record in derived:
        path = ROOT / record['path']
        assert hashlib.sha256(path.read_bytes()).hexdigest() == record['sha256']
        with Image.open(path) as im:
            im.load()
            assert list(im.size) == record['size']
        for source in record['inputs']:
            assert hashlib.sha256((ROOT / source['path']).read_bytes()).hexdigest() == source['sha256']
    assert all('HTTP Error 404' in m['reason'] for m in manifest['missing']), 'Unexplained download failure'
    result = {'status': 'passed', 'source_files_sha256_verified': len(manifest['files']),
              'source_pngs_decoded': images, 'derived_maps_verified': len(derived),
              'pokemon_records_validated': len(pokemon), 'map_records_validated': len(maps),
              'missing_item_images': sum(m['missing'].startswith('assets/items/') for m in manifest['missing']),
              'absent_alternate_license_filenames': sum(m['missing'].startswith('raw/') for m in manifest['missing'])}
    (ROOT / 'catalog/validation.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
