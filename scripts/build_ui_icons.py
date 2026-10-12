"""Original Pokelife UI pixel art. Requires Pillow; runtime has no dependency.
Run: python scripts/build_ui_icons.py. All shapes are drawn on a 16px grid.
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / 'public/assets/icons'
OUT.mkdir(parents=True, exist_ok=True)
INK, LIGHT = '#1b2a35', '#edf2df'
COLORS = dict(mint='#77d9b0', gold='#f1cf7c', rose='#ed879c', blue='#85c6e9', violet='#b48be0', orange='#f0a35a', gray='#acbbc6')
# Reused motifs intentionally keep one visual language across related concepts.
ICONS = {
 'money':('coin','gold'), 'debt':('letter','orange'), 'ball':('ball','rose'), 'ball-empty':('ball','gray'),
 'stat-joy':('sun','gold'), 'stat-vitality':('heart','mint'), 'stat-courage':('flame','rose'), 'stat-wisdom':('book','blue'), 'stat-bond':('link','violet'),
 'reputation':('star','gold'), 'infamy':('mask','violet'),
 'status-prison':('prison','gray'), 'status-wanted':('poster','rose'), 'status-outlaw':('mask','violet'), 'status-debt':('letter','orange'), 'status-married':('ring','gold'), 'status-child':('steps','mint'),
 'event-choice':('sign','mint'), 'event-auto':('steps','blue'), 'event-news':('paper','blue'), 'event-people':('people','rose'), 'event-party':('ball','mint'), 'event-echo':('hourglass','violet'), 'event-milestone':('flag','gold'), 'event-misfortune':('cloud','gray'), 'event-dark':('mask','violet'), 'event-prison':('prison','gray'), 'event-ending':('flower','rose'), 'event-life':('leaf','mint'), 'event-work':('case','blue'),
 'goal-free':('compass','mint'), 'goal-champion':('crown','gold'), 'goal-collector':('ball','blue'), 'goal-family':('heart','rose'), 'goal-career':('case','orange'), 'goal-coordinator':('ribbon','rose'), 'goal-frontier':('tower','violet'), 'goal-outlaw':('mask','violet'),
 'champion-crown':('crown','gold'), 'league-card':('card','gold'), 'hall-of-fame':('tower','gold'),
 'lock':('lock','gold'), 'pin':('pin','blue'), 'crown-lead':('crown','gold'), 'check':('check','mint'), 'star-on':('star','gold'), 'star-off':('star','gray'),
 'job-traveler':('bag','mint'), 'job-researcher':('book','blue'), 'job-keeper':('heart','rose'), 'job-merchant':('shop','gold'), 'job-syndicate':('mask','violet'), 'ribbon':('ribbon','rose'),
}

def draw_icon(shape, color):
 im = Image.new('RGBA', (16,16)); d = ImageDraw.Draw(im); c = COLORS[color]
 def rect(box, fill=c): d.rectangle(box, fill=fill)
 def poly(points, fill=c): d.polygon(points, fill=fill)
 def outline(points):
  poly(points,INK)
 def box(x,y,w,h,fill=c):
  rect((x,y,x+w-1,y+h-1),INK); rect((x+1,y+1,x+w-2,y+h-2),fill)
 if shape in ('ball','coin','sun','ring','compass'):
  outline([(5,1),(10,1),(14,5),(14,10),(10,14),(5,14),(1,10),(1,5)])
  poly([(5,2),(10,2),(13,5),(13,10),(10,13),(5,13),(2,10),(2,5)])
  if shape=='ball':
   poly([(2,8),(13,8),(13,10),(10,13),(5,13),(2,10)],LIGHT); rect((2,7,13,8),INK); box(5,5,6,6,LIGHT); rect((7,7,8,8),c)
  elif shape=='coin': rect((7,4,8,11),INK); rect((8,4,10,7),INK); rect((3,5,3,9),LIGHT)
  elif shape=='ring': box(5,5,6,6,INK); rect((6,1,9,3),LIGHT)
  elif shape=='sun': rect((4,5,5,6),INK); rect((10,5,11,6),INK); rect((5,9,10,10),INK)
  else: poly([(8,3),(11,10),(8,8),(4,12)],INK); poly([(8,3),(8,8),(4,12)],LIGHT)
 elif shape=='heart':
  outline([(1,3),(6,3),(8,5),(10,3),(14,3),(15,7),(8,15),(0,7)])
  poly([(2,4),(5,4),(8,7),(11,4),(13,4),(14,7),(8,13),(1,7)]); rect((3,5,5,6),LIGHT)
 elif shape=='flame':
  outline([(8,0),(12,5),(12,8),(14,6),(15,11),(11,15),(4,15),(1,12),(2,6),(5,8),(5,4)])
  poly([(8,2),(10,6),(10,10),(13,9),(13,11),(10,13),(5,13),(3,11),(4,9),(7,10),(7,5)]); poly([(8,9),(10,12),(7,13)],LIGHT)
 elif shape in ('book','paper','letter','card','poster'):
  box(1,2,14,12)
  if shape=='book': rect((7,3,8,12),INK); rect((3,4,5,5),LIGHT); rect((10,4,12,5),LIGHT); rect((3,8,5,9),LIGHT); rect((10,8,12,9),LIGHT)
  elif shape=='letter': d.line([(2,4),(8,9),(13,4)],fill=INK,width=2); rect((7,8,9,10),LIGHT)
  elif shape=='poster': box(5,4,6,6,INK); rect((6,5,7,6),LIGHT); rect((3,11,12,11),INK)
  elif shape=='card': box(3,4,5,7,LIGHT); rect((10,5,12,6),INK); rect((10,9,12,10),INK)
  else: rect((3,4,12,5),INK); rect((3,7,6,11),LIGHT); rect((8,7,12,8),INK); rect((8,10,12,11),INK)
 elif shape=='link':
  box(1,3,9,8); box(6,6,9,8); rect((3,5,6,8),INK); rect((9,8,12,11),INK); rect((6,6,9,9),LIGHT)
 elif shape=='star':
  outline([(7,0),(10,5),(15,5),(11,9),(12,15),(7,12),(2,15),(3,9),(0,5),(5,5)])
  poly([(7,3),(9,6),(12,6),(9,9),(10,12),(7,10),(4,12),(5,9),(2,6),(6,6)]); rect((6,6,7,7),LIGHT)
 elif shape=='mask':
  outline([(1,3),(7,5),(9,5),(14,3),(15,10),(12,14),(8,12),(4,14),(0,10)])
  poly([(2,5),(7,7),(9,7),(13,5),(13,10),(11,12),(8,10),(4,12),(2,10)]); rect((3,7,5,9),LIGHT); rect((10,7,12,9),LIGHT)
 elif shape=='prison':
  box(1,1,14,14,INK)
  for x in (3,7,11): rect((x,2,x+1,13))
  rect((2,4,13,5)); rect((2,10,13,11))
 elif shape=='steps':
  box(2,1,5,8); box(9,7,5,8); rect((3,3,4,5),LIGHT); rect((10,9,11,11),LIGHT)
 elif shape=='people':
  box(2,1,5,5); box(9,3,5,5,LIGHT); box(0,7,8,7); box(8,9,8,6,LIGHT)
 elif shape in ('sign','flag'):
  box(6,2,3,14,INK)
  if shape=='sign':
   outline([(1,1),(11,1),(15,4),(11,7),(1,7)]); poly([(2,2),(10,2),(13,4),(10,5),(2,5)])
   outline([(0,10),(4,7),(14,7),(14,13),(4,13)]); poly([(3,10),(5,8),(13,8),(13,11),(5,11)],LIGHT)
  else: box(8,2,7,7); rect((9,3,11,4),LIGHT); rect((3,14,12,15),INK)
 elif shape=='hourglass':
  box(2,0,12,3); box(2,13,12,3); outline([(3,3),(12,3),(9,8),(12,12),(3,12),(6,8)]); poly([(5,3),(10,3),(8,7),(6,5)]); poly([(8,9),(10,12),(5,12)],LIGHT)
 elif shape=='cloud':
  outline([(1,6),(4,6),(4,3),(10,3),(12,6),(14,6),(15,11),(1,11)])
  poly([(2,7),(5,7),(5,4),(9,4),(11,7),(13,7),(13,9),(2,9)]); rect((4,12,5,14),COLORS['blue']); rect((10,12,11,15),COLORS['blue'])
 elif shape in ('flower','leaf'):
  rect((7,7,8,15),INK); poly([(7,13),(2,9),(2,13),(7,15)],COLORS['mint'])
  if shape=='flower':
   box(5,1,6,11); box(2,4,12,5); rect((6,5,9,7),LIGHT)
  else: outline([(4,1),(14,1),(14,9),(8,13),(3,8)]); poly([(5,2),(12,2),(12,8),(8,11),(4,7)]); d.line((5,10,11,4),fill=LIGHT,width=1)
 elif shape in ('case','bag','shop'):
  box(5,1,6,4); box(1,4,14,11)
  if shape=='shop': rect((1,4,14,7),LIGHT); rect((3,4,5,7)); rect((9,4,11,7)); box(6,9,5,6,INK)
  elif shape=='bag': box(4,9,8,5,LIGHT); rect((3,5,4,7),LIGHT)
  else: rect((2,8,13,9),INK); rect((7,8,8,10),LIGHT)
 elif shape=='crown':
  outline([(0,2),(5,6),(8,1),(11,6),(15,2),(13,14),(2,14)])
  poly([(2,5),(5,8),(8,4),(11,8),(13,5),(12,12),(3,12)]); rect((4,10,11,11),LIGHT)
 elif shape=='ribbon':
  poly([(3,7),(7,8),(6,15),(3,13),(1,14)],INK); poly([(9,8),(12,7),(15,14),(12,13),(10,15)],INK)
  rect((3,9,5,12)); rect((10,9,12,12)); outline([(5,0),(10,0),(14,4),(12,9),(8,12),(3,9),(1,4)])
  poly([(5,2),(10,2),(12,5),(10,8),(7,10),(4,8),(3,5)]); rect((6,4,9,7),LIGHT)
 elif shape=='tower':
  box(2,2,12,4); box(3,6,10,9); rect((5,0,6,2),INK); rect((10,0,11,2),INK); box(6,10,4,5,INK); rect((5,7,6,8),LIGHT); rect((10,7,11,8),LIGHT)
 elif shape=='lock':
  box(4,1,8,8,INK); rect((5,2,10,3)); rect((5,3,6,7)); rect((9,3,10,7)); box(2,7,12,8); rect((7,10,8,12),INK)
 elif shape=='pin':
  box(4,1,8,4); box(5,5,6,5); box(2,9,12,3); rect((7,12,8,15),LIGHT)
 elif shape=='check':
  outline([(0,7),(3,4),(6,7),(12,1),(15,4),(6,14)]); poly([(2,7),(3,6),(6,10),(12,3),(13,4),(6,12)])
 return im

for name,(shape,color) in ICONS.items():
 im=draw_icon(shape,color)
 for size in (16,24,32):
  im.resize((size,size),Image.Resampling.NEAREST).save(OUT / f'{name}{"" if size==16 else "@"+str(size)}.png',optimize=True)
print(f'{len(ICONS)} original icons, {len(ICONS)*3} PNGs')
