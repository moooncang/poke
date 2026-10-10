#!/usr/bin/env python3
"""Fetch pinned public source data and artwork; no runtime API dependency."""
import concurrent.futures
import csv
import hashlib
import io
import json
from pathlib import Path
import tarfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1] / 'resources'
SOURCES = {
    'pokeapi': ('PokeAPI/pokeapi', 'c80757193bd0889054e36f4209762360bdaa4b95', 'c6ef6446fc80cc5db4ff1ea87427a939a907ebbd033b7e19e44eda560e22915a'),
    'pokefirered': ('pret/pokefirered', '037335f4c725d7c9aecdac87066f2002b4bd7e14', '4ba75a0aa13937084cef97b82401b440a8c0fa7dadef35581689962ec2281bc2'),
    'pokeemerald': ('pret/pokeemerald', '731ad5bfd6e6f265508d0efcca0ba42f9dcf5881', '737c8794455180d3c03655d6d6fafb062943f6613a43e05d8fb70cae785830b0'),
}
SPRITE_COMMIT = '961f4fcc85b159f9c5fff356356dee1bf9069898'
SPRITE_BASE = f'https://raw.githubusercontent.com/PokeAPI/sprites/{SPRITE_COMMIT}/'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read_url(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=40) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code in (404, 403):
                raise
            if attempt == 2:
                raise
        except (OSError, TimeoutError):
            if attempt == 2:
                raise
        time.sleep(1 + attempt)


def save(rel, data, source, source_path, url):
    dest = ROOT / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists() or digest(dest.read_bytes()) != digest(data):
        dest.write_bytes(data)
    return {'path': rel, 'source': source, 'source_path': source_path,
            'url': url, 'bytes': len(data), 'sha256': digest(data)}


def select(source, path):
    if path in ('README.md', 'LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING'):
        return True
    if source == 'pokeapi':
        return path.startswith('data/v2/csv/') and path.endswith('.csv')
    return (path.startswith('data/maps/') and path.endswith('/map.json')
            or path == 'data/layouts/layouts.json'
            or path == 'src/data/region_map/region_map_sections.json'
            or path == 'src/data/wild_encounters.json'
            or path.startswith(('graphics/region_map/', 'graphics/pokenav/region_map/'))
            or path.startswith(('graphics/object_events/pics/people/', 'graphics/trainers/front_pics/')) and path.endswith('.png'))


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    manifest_path = ROOT / 'manifest.json'
    previous = json.loads(manifest_path.read_text()) if manifest_path.exists() else {'files': []}
    previous = {x['path']: x for x in previous['files']}
    records, missing = [], []
    for source, (repo, commit, expected) in SOURCES.items():
        url = f'https://codeload.github.com/{repo}/tar.gz/{commit}'
        cache = Path('/tmp') / f'{source}.tar.gz'
        data = cache.read_bytes() if cache.exists() else read_url(url)
        if digest(data) != expected:
            raise ValueError(f'{source}: archive checksum mismatch')
        with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as archive:
            for member in archive.getmembers():
                if not member.isfile():
                    continue
                path = member.name.split('/', 1)[-1]
                if '..' in Path(path).parts or Path(path).is_absolute():
                    raise ValueError('Unsafe archive path')
                if select(source, path):
                    records.append(save(f'raw/{source}/{path}', archive.extractfile(member).read(),
                                        source, path, f'https://github.com/{repo}/blob/{commit}/{path}'))
        print(f'{source}: extracted, {len(records)} total source files', flush=True)

    csv_dir = ROOT / 'raw/pokeapi/data/v2/csv'
    with (csv_dir / 'pokemon_species.csv').open() as handle:
        ids = [int(row['id']) for row in csv.DictReader(handle)]
    jobs = [(f'pokemon/{i}.png', f'pokemon/front/{i}.png') for i in ids]
    jobs += [(f'pokemon/shiny/{i}.png', f'pokemon/shiny/{i}.png') for i in ids]
    jobs += [(f'pokemon/other/official-artwork/{i}.png', f'pokemon/artwork/{i}.png') for i in ids]
    jobs += [(f'pokemon/back/{i}.png', f'pokemon/back/{i}.png') for i in ids if i <= 251]
    with (csv_dir / 'items.csv').open() as handle:
        items = list(csv.DictReader(handle))
    # Everyday supplies, berries and evolution items are useful for life events.
    categories = {'3', '4', '5', '6', '7', '8', '9', '10', '11', '24', '27', '28', '29', '30', '33', '34', '35', '43'}
    jobs += [(f'items/{r["identifier"]}.png', f'items/{r["identifier"]}.png')
             for r in items if r['category_id'] in categories]
    jobs += [(p, 'source/' + p) for p in ('README.md', 'LICENCE.txt', 'LICENSE', 'LICENSE.md', 'CONTRIBUTING_SPRITES.md')]

    def fetch(job):
        remote, local = job
        is_doc = local.startswith('source/')
        source_path = remote if is_doc else 'sprites/' + remote
        rel = 'raw/sprites/' + local if is_doc else 'assets/' + local
        url = SPRITE_BASE + source_path
        dest = ROOT / rel
        old = previous.get(rel)
        if old and old['url'] == url and dest.exists() and digest(dest.read_bytes()) == old['sha256']:
            return old
        try:
            data = read_url(url)
            if not is_doc and not data.startswith(b'\x89PNG\r\n\x1a\n'):
                raise ValueError('Not PNG')
            return save(rel, data, 'sprites', source_path, url)
        except Exception as error:
            return {'missing': rel, 'url': url, 'reason': str(error)}

    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        for i, result in enumerate(pool.map(fetch, jobs), 1):
            (missing if 'missing' in result else records).append(result)
            if i % 250 == 0:
                print(f'images/docs: {i}/{len(jobs)}, missing {len(missing)}', flush=True)
    result = {'sources': {k: {'repository': repo, 'commit': commit, 'archive_sha256': sha}
                          for k, (repo, commit, sha) in SOURCES.items()},
              'sprite_source': {'repository': 'PokeAPI/sprites', 'commit': SPRITE_COMMIT},
              'files': sorted(records, key=lambda r: r['path']), 'missing': missing}
    manifest_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(f'Done: {len(records)} files; {len(missing)} missing; see manifest.json', flush=True)


if __name__ == '__main__':
    main()
