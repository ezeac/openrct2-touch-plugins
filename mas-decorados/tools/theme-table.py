#!/usr/bin/env python3
# Uso: theme-table.py <carpeta object del juego> > ../src/theme-table.js
# La API no da el contenido de un tema sin cargarlo, así que se arma desde los objetos que trae OpenRCT2 0.5.6.
import glob, json, sys, zipfile

# Los objetos vienen sueltos en .json o empaquetados en .parkobj, un zip con su object.json.
def read(path):
    if path.endswith('.parkobj'):
        return json.loads(zipfile.ZipFile(path).read('object.json').decode('utf-8-sig'))
    return json.load(open(path, encoding='utf-8-sig'))

root = sys.argv[1].rstrip('/')
paths = glob.glob(root + '/**/*.json', recursive=True) + glob.glob(root + '/**/*.parkobj', recursive=True)
rows = []
objects = [read(path) for path in sorted(paths, key=lambda p: p.rsplit('/', 1)[1])]
for data in objects:
    if data.get('objectType') != 'scenery_group':
        continue
    scenery = [e for e in data.get('properties', {}).get('entries', []) if e.split('.')[1] != 'peep_animations']
    if scenery:
        rows.append('    "%s": [%d, "%s"]' % (data['id'], len(scenery), scenery[0]))

print('// Generado con tools/theme-table.py desde OpenRCT2 0.5.6: no editar a mano.')
print('// Por tema: cantidad de decorados, sin disfraces de animadores, y el primero, que sirve para ver si están los datos de su expansión.')
print('var THEME_TABLE = {')
print(',\n'.join(rows))
print('};')

# Lo que trae el juego: los prefijos de sus objetos, y los decorados que no están en ningún tema.
SCENERY = ('scenery_small', 'scenery_large', 'scenery_wall', 'footpath_banner', 'footpath_item')
members = set(e for d in objects if d.get('objectType') == 'scenery_group' for e in d.get('properties', {}).get('entries', []))
prefixes = sorted(set(d['id'].split('.')[0] for d in objects))
loose = sorted(d['id'] for d in objects if d.get('objectType') in SCENERY and d['id'] not in members)
print('var STOCK_PREFIXES = %s;' % json.dumps(prefixes))
print('var STOCK_LOOSE = %s;' % json.dumps(loose))
