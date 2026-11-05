#!/usr/bin/env python3
# Uso: track-support.py <fuente de OpenRCT2> > ../src/track-support.js
# Arma, por tipo de atracción, las piezas que el juego dibuja y deja construir: TrackPlaceAction no lo valida.
import re, glob, sys

S = sys.argv[1].rstrip('/') + '/src/openrct2/'

def enum(path, name):
    t = open(path).read()
    b = t[t.index('{', t.index('enum class ' + name)) + 1:]
    b = b[:b.index('};')]
    n, ids = -1, {}
    for l in b.splitlines():
        m = re.match(r'(\w+)\s*(=\s*(\w+))?\s*,?$', l.split('//')[0].strip())
        if not m:
            continue
        v = m.group(3)
        n = (int(v) if v.isdigit() else ids[v]) if v else n + 1
        ids[m.group(1)] = n
    return ids

def block(src, start):
    i, depth = start, 1
    while depth:
        depth += {'{': 1, '}': -1}.get(src[i], 0)
        i += 1
    return src[start:i - 1]

track = enum(S + 'ride/ted/TrackElemType.h', 'TrackElemType')
group = enum(S + 'ride/ted/TrackGroup.h', 'TrackGroup')
style = enum(S + 'ride/TrackStyle.h', 'TrackStyle')

DUMMY = ('nullptr', 'TrackPaintFunctionDummy')
CALL = r'((?:\w+::)*[gG]etTrackPaintFunction\w*)(?:<[^>]*>)?\(trackType\)'
funcs = {}
for f in glob.glob(S + 'paint/**/*.cpp', recursive=True):
    src = open(f).read()
    for m in re.finditer(r'TrackPaintFunction ((?:\w+::)?[gG]etTrackPaintFunction\w*)\(TrackElemType trackType\)\s*\{', src):
        name = m.group(1).split('::')[-1]
        if name == 'GetTrackPaintFunction':
            name = re.findall(r'namespace (?:OpenRCT2::)?(\w+)', src[:m.start()])[-1] + '::' + name
        painted, hidden, labels, delegate, guard = set(), set(), [], None, None
        for tok in re.finditer(r'case TrackElemType::(\w+)\s*:|default\s*:|return ([^;]+);', re.sub(r'//.*', '', block(src, m.end()))):
            if tok.group(1):
                labels.append(track[tok.group(1)])
            elif tok.group(0).startswith('default'):
                labels.append('default')
            else:
                r = tok.group(2).strip()
                call = re.match(CALL, r)
                if not labels and call:
                    guard = call.group(1).split('::')[-1]
                for lab in labels:
                    if lab == 'default':
                        delegate = call and call.group(1).split('::')[-1]
                    elif r in DUMMY:
                        hidden.add(lab)
                    else:
                        painted.add(lab)
                labels = []
        funcs[name] = (painted, hidden, delegate, guard)

def paintable(name):
    painted, hidden, delegate, guard = funcs[name]
    res = set(painted)
    if delegate:
        res |= paintable(delegate) - hidden
    if guard:
        res = res & paintable(guard) if painted or hidden or delegate else paintable(guard)
    return res

getters = {}
ts = open(S + 'ride/TrackStyle.cpp').read()
for f, s in re.findall(r'((?:\w+::)*[gG]etTrackPaintFunction\w*),\s*//\s*(\w+)', ts):
    parts = f.split('::')
    getters[style[s]] = parts[-2] + '::' + parts[-1] if parts[-1] == 'GetTrackPaintFunction' else parts[-1]

rd = open(S + 'ride/RideData.cpp').read()
order = re.findall(r'\*/\s*(k\w+RTD)', rd[rd.index('kRideTypeDescriptors[RIDE_TYPE_COUNT]'):])
rtds = {}
for f in glob.glob(S + 'ride/rtd/**/*.h', recursive=True):
    t = open(f).read()
    for m in re.finditer(r'constexpr RideTypeDescriptor (k\w+RTD)\s*=', t):
        rtds[m.group(1)] = t[m.end():]

masks, rides = [], {}
for rideType, name in enumerate(order):
    t = rtds.get(name)
    if t is None or '.TrackPaintFunctions' not in t:
        continue
    p = t.index('.TrackPaintFunctions')
    s = style[re.search(r'\.trackStyle = TrackStyle::(\w+)', t[p:]).group(1)]
    q = t.index('.enabledTrackGroups', p)
    enabled = sorted(group[g] for g in re.findall(r'TrackGroup::(\w+)', t[t.index('{', q) + 1:t.index('}', q)]))
    if s not in getters:
        continue
    mask = sum(1 << x for x in paintable(getters[s]))
    if mask == 0:
        continue
    hexmask = format(mask, 'x')
    if hexmask not in masks:
        masks.append(hexmask)
    rides[rideType] = (masks.index(hexmask), enabled)

print('// Generado con tools/track-support.py desde OpenRCT2 0.5.6: no editar a mano.')
print('var TRACK_PAINT_MASKS = [')
print(',\n'.join('    "%s"' % m for m in masks))
print('];')
print('var RIDE_TRACK_SUPPORT = {')
print(',\n'.join('    %d: [%d, [%s]]' % (k, v[0], ', '.join(map(str, v[1]))) for k, v in sorted(rides.items())))
print('};')
