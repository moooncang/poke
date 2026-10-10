#!/usr/bin/env python3
"""Decode original GBA map data into PNGs (Pillow required).

FireRed: 30x20 text BG, 16-bit tile entries, 4-bit indexed tile pixels.
Emerald: 64x64 affine BG, 8-bit tile entries, 8-bit indexed tile pixels.
This is format conversion, with original tiles and palettes preserved.
"""
import hashlib
import json
from pathlib import Path
import struct
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'resources'
OUT = ROOT / 'assets/maps'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def decode(source, tiles_name, map_name, palette_name, width, affine, name):
    base = ROOT / 'raw' / source
    tiles_path, map_path, pal_path = [base / p for p in (tiles_name, map_name, palette_name)]
    tiles = Image.open(tiles_path)
    palette = [tuple(map(int, line.split())) for line in pal_path.read_text().splitlines()[3:] if line.strip()]
    raw = map_path.read_bytes()
    entries = list(raw) if affine else struct.unpack('<' + 'H' * (len(raw) // 2), raw)
    assert len(entries) % width == 0
    output = Image.new('RGB', (width * 8, len(entries) // width * 8))
    pixels = output.load()
    for n, entry in enumerate(entries):
        tile = entry if affine else entry & 1023
        bank = 0 if affine else entry >> 12
        tx, ty = (tile % (tiles.width // 8)) * 8, (tile // (tiles.width // 8)) * 8
        assert ty + 8 <= tiles.height, f'Tile {tile} out of range'
        for y in range(8):
            for x in range(8):
                sx = 7 - x if not affine and entry & 1024 else x
                sy = 7 - y if not affine and entry & 2048 else y
                index = tiles.getpixel((tx + sx, ty + sy))
                index = index if affine else (index % 16) + bank * 16
                # The source PNG carries the full 8bpp palette for the affine map.
                if affine:
                    color = tuple(tiles.getpalette()[index * 3:index * 3 + 3])
                else:
                    color = palette[index]
                pixels[n % width * 8 + x, n // width * 8 + y] = color
    dest = OUT / (name + '.png')
    output.save(dest)
    return {'path': str(dest.relative_to(ROOT)), 'size': list(output.size), 'sha256': sha(dest),
            'source': source, 'conversion': 'affine-8bpp' if affine else 'text-bg-4bpp',
            'inputs': [{'path': str(p.relative_to(ROOT)), 'sha256': sha(p)} for p in (tiles_path, map_path, pal_path)]}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    records = []
    for region in ('kanto', 'sevii_123', 'sevii_45', 'sevii_67'):
        records.append(decode('pokefirered', 'graphics/region_map/region_map.png',
                              f'graphics/region_map/{region}.bin', 'graphics/region_map/region_map.pal', 30, False, region))
    records.append(decode('pokeemerald', 'graphics/pokenav/region_map/map.png',
                          'graphics/pokenav/region_map/map.bin', 'graphics/pokenav/region_map/map.pal', 64, True, 'hoenn'))
    (ROOT / 'catalog/derived-maps.json').write_text(json.dumps(records, indent=2) + '\n')
    print('Decoded', len(records), 'regional maps')


if __name__ == '__main__':
    main()
