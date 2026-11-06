#!/usr/bin/env python3
# Uso: tests/objetos-prueba.py — instala en el usuario de prueba de la PC (no en el celular) objetos sueltos de dos autores,
# uno sin autor y un tema propio, copiados de objetos del juego, para la prueba de Más decorados.
import json, os

GAME = os.path.expanduser('~/openrct2-test/squashfs-root/usr/share/openrct2/object/rct2')
DEST = os.path.expanduser('~/openrct2-test/user/object/prueba-sueltos')

COPIES = [
    ('scenery_small/rct2.scenery_small.tic.json', 'prueba.scenery_small.arbol1', ['Autor A']),
    ('scenery_small/rct2.scenery_small.tic.json', 'prueba.scenery_small.arbol2', ['Autor A']),
    ('scenery_small/rct2.scenery_small.tic.json', 'prueba.scenery_small.arbol3', ['Autor A']),
    ('scenery_wall/rct2.scenery_wall.wallbadm.json', 'prueba.scenery_wall.muro1', ['Autor B']),
    ('scenery_large/rct2.scenery_large.genstore.json', 'prueba.scenery_large.tienda1', ['Autor B']),
    ('scenery_small/rct2.scenery_small.tic.json', 'prueba.scenery_small.anonimo', []),
    ('scenery_small/rct2.scenery_small.tic.json', 'prueba.scenery_small.detema1', ['Autor C']),
    ('scenery_small/rct2.scenery_small.tic.json', 'prueba.scenery_small.detema2', ['Autor C']),
    ('scenery_group/rct2.scenery_group.scgabstr.json', 'prueba.scenery_group.tema', ['Autor C']),
]
# El tema de prueba trae sólo los dos de Autor C, que no tienen que salir como sueltos.
ENTRIES = {'prueba.scenery_group.tema': ['prueba.scenery_small.detema1', 'prueba.scenery_small.detema2']}

os.makedirs(DEST, exist_ok=True)
for source, identifier, authors in COPIES:
    data = json.load(open(os.path.join(GAME, source), encoding='utf-8-sig'))
    data.pop('originalId', None)
    data.update({'id': identifier, 'authors': authors, 'sourceGame': ['custom']})
    data['strings']['name'] = {'en-GB': identifier.split('.')[-1]}
    if identifier in ENTRIES:
        data['properties']['entries'] = ENTRIES[identifier]
    json.dump(data, open(os.path.join(DEST, identifier + '.json'), 'w'), ensure_ascii=False, indent=2)
print(DEST)
