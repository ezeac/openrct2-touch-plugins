(function () {
"use strict";
var TEXTS = {
    en: {
        title: "Connect paths",
        internalError: "Connect paths: internal error",
        idle: "Tap \"Pick paths\" to start.",
        pickA: "Tap the first path to connect.",
        pickB: "Tap the second path.",
        planning: "Looking for a route...",
        preview: "Move the camera to check the route.",
        length: "Length: {BLACK}{0} paths (+{1})",
        lengthNone: "Length: {BLACK}-",
        cost: "Cost: {BLACK}{0}",
        costNone: "Cost: {BLACK}-",
        undo: "Undo last ({0})",
        noRoute: "There is no possible route between those two.",
        noLonger: "It cannot get longer with this turn width.",
        removesScenery: "Removes scenery in {0} spot(s).",
        buildFailed: "The path could not be built",
        built: "Done: {0} paths for {1}.",
        undone: "Undone. {0} refunded.",
        pick: "Pick paths",
        route: "Route",
        lengthen: "Lengthen",
        turnWidth: "Turn width:",
        build: "Build",
        cancel: "Cancel"
    },
    es: {
        title: "Conectar caminos",
        internalError: "Conectar caminos: error interno",
        idle: "Tocá \"Elegir caminos\" para empezar.",
        pickA: "Tocá el primer camino a conectar.",
        pickB: "Tocá el segundo camino.",
        planning: "Buscando el camino...",
        preview: "Mové la cámara para revisar el trazado.",
        length: "Largo: {BLACK}{0} caminos (+{1})",
        lengthNone: "Largo: {BLACK}-",
        cost: "Costo: {BLACK}{0}",
        costNone: "Costo: {BLACK}-",
        undo: "Deshacer última ({0})",
        noRoute: "No hay un camino posible entre esos dos.",
        noLonger: "No entra más largo con este ancho.",
        removesScenery: "Quita decoración en {0} lugar(es).",
        buildFailed: "No se pudo construir el camino",
        built: "Listo: {0} caminos por {1}.",
        undone: "Deshecho. Se devolvieron {0}.",
        pick: "Elegir caminos",
        route: "Trazado",
        lengthen: "Alargar",
        turnWidth: "Ancho de vuelta:",
        build: "Construir",
        cancel: "Cancelar"
    }
};
var translations = null;

// Texts in the game's language, or English when the plugin has no translation for it.
function t(key) {
    if (!translations) {
        var language = String(context.configuration.get("general.language", "en-GB") || "en-GB").split("-")[0];
        translations = TEXTS[language] || TEXTS.en;
    }
    var text = translations[key] !== undefined ? translations[key] : TEXTS.en[key];
    for (var i = 1; i < arguments.length; i++) {
        text = text.replace("{" + (i - 1) + "}", arguments[i]);
    }
    return text;
}
var DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]];
var GHOST_FLAG = 64;
var SLOPE_STEP = 16;
var MAX_EXPANSIONS = 20000;
var SEARCH_MARGIN = 24;
var DETOUR_RADIUS = 8;
var DETOUR_EXPANSIONS = 500;

function opposite(d) {
    return (d + 2) % 4;
}

function tileKey(x, y) {
    return x + "," + y;
}

function placementKey(p) {
    return p.x + "," + p.y + "," + p.z + "," + p.slope;
}

function getFootpath(x, y, index) {
    var element = map.getTile(x, y).elements[index];
    return element && element.type === "footpath" ? element : null;
}

function findFootpathAt(x, y, z) {
    var elements = map.getTile(x, y).elements;
    for (var i = 0; i < elements.length; i++) {
        if (elements[i].type === "footpath" && !elements[i].isGhost && elements[i].baseZ === z) {
            return elements[i];
        }
    }
    return null;
}

function surfaceZ(x, y) {
    var elements = map.getTile(x, y).elements;
    for (var i = 0; i < elements.length; i++) {
        if (elements[i].type === "surface") {
            return elements[i].baseZ;
        }
    }
    return 0;
}

// Existing paths would be replaced and track would become a level crossing, so neither can be crossed.
function isBlockedTile(x, y, z) {
    var elements = map.getTile(x, y).elements;
    for (var i = 0; i < elements.length; i++) {
        var e = elements[i];
        if (e.isGhost) continue;
        if (e.type === "surface" && z < e.baseZ) return true;
        if (e.type === "footpath" && Math.abs(e.baseZ - z) <= 32) return true;
        if (e.type === "track" && e.baseZ < z + 48 && e.clearanceZ > z) return true;
    }
    return false;
}

function hasSceneryInTheWay(x, y, z) {
    var elements = map.getTile(x, y).elements;
    for (var i = 0; i < elements.length; i++) {
        var e = elements[i];
        if (e.type === "small_scenery" && !e.isGhost && e.baseZ < z + 48 && e.clearanceZ > z) return true;
    }
    return false;
}

// A path tile's connection points: flat paths open to all sides at their height, sloped ones only along the slope.
function portsOf(p) {
    if (p.slope < 0) {
        return [{ dir: 0, z: p.z }, { dir: 1, z: p.z }, { dir: 2, z: p.z }, { dir: 3, z: p.z }];
    }
    return [{ dir: p.slope, z: p.z + SLOPE_STEP }, { dir: opposite(p.slope), z: p.z }];
}

function portTowards(p, dir) {
    var ports = portsOf(p);
    for (var i = 0; i < ports.length; i++) {
        if (ports[i].dir === dir) {
            return ports[i];
        }
    }
    return null;
}

function candidatesEntering(x, y, dir, z) {
    return [
        { x: x, y: y, z: z, slope: -1 },
        { x: x, y: y, z: z, slope: dir },
        { x: x, y: y, z: z - SLOPE_STEP, slope: opposite(dir) }
    ];
}

function endpointFromElement(x, y, element) {
    return {
        x: x,
        y: y,
        z: element.baseZ,
        slope: element.slopeDirection === null ? -1 : element.slopeDirection,
        fixed: true
    };
}

function pathStyleFrom(element) {
    var queueFlag = element.isQueue ? 1 : 0;
    if (element.surfaceObject !== null) {
        return { object: element.surfaceObject, railingsObject: element.railingsObject, constructFlags: queueFlag };
    }
    return { object: element.object, railingsObject: 0, constructFlags: queueFlag | 2 };
}

function layoutArgs(p, style, edges, flags) {
    return {
        x: p.x * 32,
        y: p.y * 32,
        z: p.z,
        edges: edges,
        object: style.object,
        railingsObject: style.railingsObject,
        slopeType: p.slope < 0 ? 0 : 1,
        slopeDirection: p.slope < 0 ? 0 : p.slope,
        constructFlags: style.constructFlags,
        flags: flags
    };
}

function createValidator(style, allowScenery) {
    var cache = {};
    var mapSize = map.size;
    return function (p) {
        var key = placementKey(p);
        if (cache[key] !== undefined) {
            return cache[key];
        }
        var ok = false;
        if (p.x >= 1 && p.y >= 1 && p.x < mapSize.x - 1 && p.y < mapSize.y - 1 && p.z >= 0
            && !isBlockedTile(p.x, p.y, p.z) && (allowScenery || !hasSceneryInTheWay(p.x, p.y, p.z))) {
            context.queryAction("footpathlayoutplace", layoutArgs(p, style, 0, 0), function (result) {
                ok = !result.error;
            });
        }
        cache[key] = ok;
        return ok;
    };
}

function Heap() {
    this.items = [];
}

Heap.prototype.push = function (item) {
    var items = this.items;
    items.push(item);
    var i = items.length - 1;
    while (i > 0) {
        var parent = (i - 1) >> 1;
        if (items[parent].f <= items[i].f) {
            break;
        }
        var tmp = items[parent];
        items[parent] = items[i];
        items[i] = tmp;
        i = parent;
    }
};

Heap.prototype.pop = function () {
    var items = this.items;
    var top = items[0];
    var last = items.pop();
    if (items.length > 0) {
        items[0] = last;
        var i = 0;
        for (;;) {
            var l = 2 * i + 1, r = l + 1, m = i;
            if (l < items.length && items[l].f < items[m].f) m = l;
            if (r < items.length && items[r].f < items[m].f) m = r;
            if (m === i) break;
            var tmp = items[m];
            items[m] = items[i];
            items[i] = tmp;
            i = m;
        }
    }
    return top;
};

function stepCost(p) {
    var elevation = Math.max(0, p.z - surfaceZ(p.x, p.y));
    return 1 + (p.slope >= 0 ? 0.25 : 0) + (elevation / SLOPE_STEP) * 0.6 + (hasSceneryInTheWay(p.x, p.y, p.z) ? 6 : 0);
}

// Avoids trees and decoration whenever possible, because removing them cannot be undone.
function planRoute(a, b, style) {
    var isValid = createValidator(style, false);
    var chain = findShortestChain(a, b, isValid);
    if (!chain) {
        isValid = createValidator(style, true);
        chain = findShortestChain(a, b, isValid);
    }
    return chain ? { chain: chain, isValid: isValid } : null;
}

function sceneryRemovedBy(chain) {
    var count = 0;
    for (var i = 1; i < chain.length - 1; i++) {
        if (hasSceneryInTheWay(chain[i].x, chain[i].y, chain[i].z)) count++;
    }
    return count;
}

// Returns the chain [a, ...new tiles..., b] or null when the endpoints cannot be joined.
function findShortestChain(a, b, isValid, maxExpansions) {
    var limit = maxExpansions || MAX_EXPANSIONS;
    var goals = {};
    var bPorts = portsOf(b);
    for (var i = 0; i < bPorts.length; i++) {
        var gx = b.x + DIRS[bPorts[i].dir][0];
        var gy = b.y + DIRS[bPorts[i].dir][1];
        goals[tileKey(gx, gy)] = goals[tileKey(gx, gy)] || [];
        goals[tileKey(gx, gy)].push({ dir: opposite(bPorts[i].dir), z: bPorts[i].z });
    }

    var aPorts = portsOf(a);
    for (var j = 0; j < aPorts.length; j++) {
        if (a.x + DIRS[aPorts[j].dir][0] === b.x && a.y + DIRS[aPorts[j].dir][1] === b.y) {
            var back = portTowards(b, opposite(aPorts[j].dir));
            if (back && back.z === aPorts[j].z) {
                return [a, b];
            }
        }
    }

    var minX = Math.min(a.x, b.x) - SEARCH_MARGIN, maxX = Math.max(a.x, b.x) + SEARCH_MARGIN;
    var minY = Math.min(a.y, b.y) - SEARCH_MARGIN, maxY = Math.max(a.y, b.y) + SEARCH_MARGIN;
    var heuristic = function (p) {
        return Math.max(0, Math.abs(p.x - b.x) + Math.abs(p.y - b.y) - 1);
    };
    var isGoal = function (p) {
        var wanted = goals[tileKey(p.x, p.y)];
        if (!wanted) return false;
        for (var k = 0; k < wanted.length; k++) {
            var port = portTowards(p, wanted[k].dir);
            if (port && port.z === wanted[k].z) return true;
        }
        return false;
    };

    var open = new Heap();
    var best = {};
    for (var s = 0; s < aPorts.length; s++) {
        var sx = a.x + DIRS[aPorts[s].dir][0], sy = a.y + DIRS[aPorts[s].dir][1];
        var starts = candidatesEntering(sx, sy, aPorts[s].dir, aPorts[s].z);
        for (var c = 0; c < starts.length; c++) {
            var start = starts[c];
            if (start.x === b.x && start.y === b.y) continue;
            if (!portTowards(start, opposite(aPorts[s].dir)) || portTowards(start, opposite(aPorts[s].dir)).z !== aPorts[s].z) continue;
            if (!isValid(start)) continue;
            var g0 = stepCost(start);
            var node0 = { p: start, g: g0, f: g0 + heuristic(start), parent: null };
            if (best[placementKey(start)] === undefined || best[placementKey(start)] > g0) {
                best[placementKey(start)] = g0;
                open.push(node0);
            }
        }
    }

    var expansions = 0;
    while (open.items.length > 0 && expansions < limit) {
        var node = open.pop();
        var key = placementKey(node.p);
        if (best[key] < node.g) continue;
        expansions++;
        if (isGoal(node.p)) {
            var chain = [b];
            for (var n = node; n; n = n.parent) chain.push(n.p);
            chain.push(a);
            chain.reverse();
            return chain;
        }
        var ports = portsOf(node.p);
        for (var q = 0; q < ports.length; q++) {
            var nx = node.p.x + DIRS[ports[q].dir][0], ny = node.p.y + DIRS[ports[q].dir][1];
            if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;
            if ((nx === a.x && ny === a.y) || (nx === b.x && ny === b.y)) continue;
            if (onAncestorTile(node, nx, ny)) continue;
            var next = candidatesEntering(nx, ny, ports[q].dir, ports[q].z);
            for (var m = 0; m < next.length; m++) {
                if (!isValid(next[m])) continue;
                var g = node.g + stepCost(next[m]);
                var nk = placementKey(next[m]);
                if (best[nk] !== undefined && best[nk] <= g) continue;
                best[nk] = g;
                open.push({ p: next[m], g: g, f: g + heuristic(next[m]), parent: node });
            }
        }
    }
    return null;
}

function onAncestorTile(node, x, y) {
    for (var n = node; n; n = n.parent) {
        if (n.p.x === x && n.p.y === y) return true;
    }
    return false;
}

function directionBetween(from, to) {
    for (var d = 0; d < 4; d++) {
        if (from.x + DIRS[d][0] === to.x && from.y + DIRS[d][1] === to.y) return d;
    }
    return -1;
}

function canBumpFrom(p) {
    return p.slope < 0;
}

// Detour of the given depth sideways off the pair (a, b): a, a+n..a+kn, b+kn..b+n, b.
function bumpTiles(a, b, n, depth) {
    var out = [], back = [];
    for (var k = 1; k <= depth; k++) {
        out.push({ x: a.x + DIRS[n][0] * k, y: a.y + DIRS[n][1] * k, z: a.z, slope: -1 });
        back.unshift({ x: b.x + DIRS[n][0] * k, y: b.y + DIRS[n][1] * k, z: b.z, slope: -1 });
    }
    return out.concat(back);
}

function maxBumpDepth(a, b, n, limit, occupied, isValid) {
    var depth = 0;
    for (var k = 1; k <= limit; k++) {
        var pa = { x: a.x + DIRS[n][0] * k, y: a.y + DIRS[n][1] * k, z: a.z, slope: -1 };
        var pb = { x: b.x + DIRS[n][0] * k, y: b.y + DIRS[n][1] * k, z: b.z, slope: -1 };
        if (occupied[tileKey(pa.x, pa.y)] || occupied[tileKey(pb.x, pb.y)]) break;
        if (!isValid(pa) || !isValid(pb)) break;
        depth = k;
    }
    return depth;
}

// Lengthens the base chain by `extra` tiles (rounded down to even) with side detours, serpentine style.
function lengthenChain(base, extra, maxDepth, isValid) {
    var remaining = Math.floor(extra / 2);
    if (remaining <= 0) return { chain: base, added: 0 };
    var occupied = {};
    for (var i = 0; i < base.length; i++) occupied[tileKey(base[i].x, base[i].y)] = true;

    var result = [base[0]];
    var preferredSide = -1;
    var added = 0;
    i = 0;
    while (i < base.length - 1) {
        var a = base[i], b = base[i + 1];
        var d = directionBetween(a, b);
        var placed = false;
        if (remaining > 0 && d >= 0 && canBumpFrom(a) && canBumpFrom(b) && a.z === b.z) {
            var sides = preferredSide >= 0 ? [preferredSide, opposite(preferredSide)] : [(d + 1) % 4, (d + 3) % 4];
            if (preferredSide >= 0 && sides[0] !== (d + 1) % 4 && sides[0] !== (d + 3) % 4) {
                sides = [(d + 1) % 4, (d + 3) % 4];
            }
            var bestSide = -1, bestDepth = 0;
            for (var s = 0; s < sides.length; s++) {
                var depth = maxBumpDepth(a, b, sides[s], Math.min(maxDepth, remaining), occupied, isValid);
                if (depth > bestDepth) {
                    bestDepth = depth;
                    bestSide = sides[s];
                }
                if (depth === Math.min(maxDepth, remaining)) break;
            }
            if (bestDepth > 0) {
                var tiles = bumpTiles(a, b, bestSide, bestDepth);
                for (var t = 0; t < tiles.length; t++) {
                    occupied[tileKey(tiles[t].x, tiles[t].y)] = true;
                    result.push(tiles[t]);
                }
                result.push(b);
                remaining -= bestDepth;
                added += 2 * bestDepth;
                preferredSide = bestSide;
                placed = true;
                if (i + 2 < base.length) {
                    result.push(base[i + 2]);
                }
                i += 2;
            }
        }
        if (!placed) {
            result.push(b);
            i += 1;
        }
    }
    return { chain: result, added: added };
}

function excluding(isValid, blocked) {
    return function (p) {
        return !blocked[tileKey(p.x, p.y)] && isValid(p);
    };
}

// Routes through a ground tile near one of the ends, so a route that only climbs gets flat stretches to lengthen.
function detourChains(plan) {
    if (plan.detours) return plan.detours;
    var base = plan.chain, a = base[0], b = base[base.length - 1];
    var heights = {};
    [a, b].forEach(function (end) {
        portsOf(end).forEach(function (port) { heights[port.z] = true; });
    });
    var seen = {}, detours = [];
    [a, b].forEach(function (end) {
        for (var dx = -DETOUR_RADIUS; dx <= DETOUR_RADIUS; dx++) {
            for (var dy = -DETOUR_RADIUS; dy <= DETOUR_RADIUS; dy++) {
                var x = end.x + dx, y = end.y + dy, z = surfaceZ(x, y);
                if (seen[tileKey(x, y)] || Math.abs(dx) + Math.abs(dy) > DETOUR_RADIUS || !heights[z]) continue;
                seen[tileKey(x, y)] = true;
                var w = { x: x, y: y, z: z, slope: -1 };
                if ((x === a.x && y === a.y) || (x === b.x && y === b.y) || !plan.isValid(w)) continue;
                var first = findShortestChain(a, w, plan.isValid, DETOUR_EXPANSIONS);
                if (!first) continue;
                var blocked = {};
                first.forEach(function (p) { blocked[tileKey(p.x, p.y)] = true; });
                var second = findShortestChain(w, b, excluding(plan.isValid, blocked), DETOUR_EXPANSIONS);
                if (second) detours.push(first.concat(second.slice(1)));
            }
        }
    });
    detours.sort(function (p, q) { return p.length - q.length; });
    plan.detours = detours;
    return detours;
}

// Bumps on the shortest route first; if that is not enough, the same on routes that detour along the ground.
function lengthenPlan(plan, extra, maxDepth) {
    var best = lengthenChain(plan.chain, extra, maxDepth, plan.isValid);
    if (best.added >= extra) return best;
    var baseLength = plan.chain.length;
    var detours = detourChains(plan);
    for (var i = 0; i < detours.length; i++) {
        var detourAdded = detours[i].length - baseLength;
        if (detourAdded > extra) break;
        var result = lengthenChain(detours[i], extra - detourAdded, maxDepth, plan.isValid);
        var total = detourAdded + result.added;
        if (total > best.added) best = { chain: result.chain, added: total };
        if (total >= extra) break;
    }
    return best;
}

function edgesFor(chain, index) {
    var edges = 0;
    if (index > 0) edges |= 1 << directionBetween(chain[index], chain[index - 1]);
    if (index < chain.length - 1) edges |= 1 << directionBetween(chain[index], chain[index + 1]);
    return edges;
}

function newTiles(chain) {
    return chain.slice(1, chain.length - 1);
}

function queryChainCost(chain, style) {
    var total = 0, error = null;
    for (var i = 1; i < chain.length - 1; i++) {
        context.queryAction("footpathlayoutplace", layoutArgs(chain[i], style, edgesFor(chain, i), 0), function (result) {
            if (result.error) {
                error = error || result.errorMessage || result.errorTitle || "error";
            } else {
                total += result.cost || 0;
            }
        });
    }
    return { cost: total, error: error };
}

// Game actions run on the next tick, so results only arrive through callbacks.
function executeAll(calls, done) {
    var results = [], pending = calls.length;
    if (pending === 0) {
        done(results);
        return;
    }
    calls.forEach(function (call, index) {
        context.executeAction(call.action, call.args, function (result) {
            results[index] = result;
            if (--pending === 0) done(results);
        });
    });
}

function placementCalls(chain, style, flags) {
    var calls = [];
    for (var i = 1; i < chain.length - 1; i++) {
        calls.push({ action: "footpathlayoutplace", args: layoutArgs(chain[i], style, edgesFor(chain, i), flags) });
    }
    return calls;
}

function placedTiles(chain, results) {
    var placed = [];
    for (var i = 0; i < results.length; i++) {
        if (!results[i].error) placed.push({ x: chain[i + 1].x, y: chain[i + 1].y, z: chain[i + 1].z });
    }
    return placed;
}

function firstError(results) {
    for (var i = 0; i < results.length; i++) {
        if (results[i].error) return results[i].errorMessage || results[i].errorTitle || "error";
    }
    return null;
}

function placeGhosts(chain, style, done) {
    executeAll(placementCalls(chain, style, GHOST_FLAG), function (results) {
        done(placedTiles(chain, results));
    });
}

function removeGhosts(ghosts, done) {
    executeAll(ghosts.map(function (g) {
        return { action: "footpathremove", args: { x: g.x * 32, y: g.y * 32, z: g.z, flags: GHOST_FLAG } };
    }), function () {
        if (done) done();
    });
}

var EDGES_ACTION = "conectarcaminos_edges";

// Plugins may only modify tile elements from inside a game action.
function registerEdgesAction() {
    context.registerAction(EDGES_ACTION, function () {
        return {};
    }, function (e) {
        var changes = e.args.changes;
        for (var i = 0; i < changes.length; i++) {
            var c = changes[i];
            var element = findFootpathAt(c.x, c.y, c.z);
            if (element) element.edges = (element.edges | c.add) & ~c.remove;
        }
        return {};
    });
}

function changeEdges(changes, done) {
    context.executeAction(EDGES_ACTION, { changes: changes }, function () {
        done();
    });
}

function missingEdge(endpoint, dir) {
    var element = findFootpathAt(endpoint.x, endpoint.y, endpoint.z);
    if (!element) return 0;
    return element.edges & (1 << dir) ? 0 : 1 << dir;
}

// Builds the chain for real and passes an undo record, or `{ error }` after rolling back.
function buildChain(chain, style, done) {
    executeAll(placementCalls(chain, style, 0), function (results) {
        var placed = placedTiles(chain, results);
        var error = firstError(results);
        if (error) {
            removePlaced(placed, function () {
                done({ error: error });
            });
            return;
        }
        var a = chain[0], b = chain[chain.length - 1];
        var endpoints = [
            { x: a.x, y: a.y, z: a.z, add: missingEdge(a, directionBetween(a, chain[1])), remove: 0 },
            { x: b.x, y: b.y, z: b.z, add: missingEdge(b, directionBetween(b, chain[chain.length - 2])), remove: 0 }
        ];
        var cost = 0;
        results.forEach(function (r) { cost += r.cost || 0; });
        changeEdges(endpoints, function () {
            done({ tiles: placed, endpoints: endpoints, cost: cost });
        });
    });
}

function removePlaced(tiles, done) {
    executeAll(tiles.map(function (t) {
        return { action: "footpathremove", args: { x: t.x * 32, y: t.y * 32, z: t.z } };
    }), function (results) {
        var refund = 0;
        results.forEach(function (r) { if (!r.error) refund -= r.cost || 0; });
        done(refund);
    });
}

function undoBuild(record, done) {
    removePlaced(record.tiles, function (refund) {
        changeEdges(record.endpoints.map(function (e) {
            return { x: e.x, y: e.y, z: e.z, add: 0, remove: e.add };
        }), function () {
            done(refund);
        });
    });
}
var WINDOW_CLASS = "conectar-caminos";
var TOOL_ID = "conectar-caminos-elegir";
var HISTORY_KEY = "historial";
var MAX_HISTORY = 10;
var WIDTH = 240;

var state = {
    phase: "idle",
    busy: false,
    a: null,
    b: null,
    style: null,
    plan: null,
    extra: 0,
    depth: 3,
    chain: null,
    ghosts: [],
    message: ""
};

// Plugin errors only reach the console, which is not visible on a phone.
function safely(fn) {
    return function () {
        try {
            return fn.apply(this, arguments);
        } catch (e) {
            state.busy = false;
            ui.showError(t("internalError"), String(e && e.message || e));
            console.log("conectar-caminos: " + (e && e.stack || e));
        }
    };
}

function money(value) {
    return context.formatString("{CURRENCY2DP}", value);
}

function history() {
    return context.getParkStorage().get(HISTORY_KEY, []);
}

function saveHistory(list) {
    context.getParkStorage().set(HISTORY_KEY, list.slice(-MAX_HISTORY));
}

function getWindow() {
    return ui.getWindow(WINDOW_CLASS);
}

function setText(name, text) {
    var w = getWindow();
    if (w) w.findWidget(name).text = text;
}

function setDisabled(name, disabled) {
    var w = getWindow();
    if (w) w.findWidget(name).isDisabled = disabled;
}

function highlight(tiles) {
    ui.tileSelection.tiles = tiles.map(function (t) {
        return { x: t.x * 32, y: t.y * 32 };
    });
}

function refresh() {
    var w = getWindow();
    if (!w) return;
    var previewing = state.phase === "preview" && state.chain !== null;
    var instructions = {
        idle: t("idle"),
        pickA: t("pickA"),
        pickB: t("pickB"),
        planning: t("planning"),
        preview: t("preview")
    };
    setText("status", state.message || instructions[state.phase]);
    var length = previewing ? state.chain.length - 2 : 0;
    setText("length", previewing ? t("length", length, state.extra) : t("lengthNone"));
    setText("cost", previewing ? t("cost", money(state.cost)) : t("costNone"));
    setText("depth", String(state.depth));
    setDisabled("less", !previewing || state.busy || state.extra === 0);
    setDisabled("more", !previewing || state.busy);
    setDisabled("build", !previewing || state.busy);
    setDisabled("cancel", state.phase === "idle" || state.busy);
    var undoCount = history().length;
    setText("undo", t("undo", undoCount));
    setDisabled("undo", state.busy || undoCount === 0 || previewing);
}

function clearPreview(done) {
    var ghosts = state.ghosts;
    state.ghosts = [];
    removeGhosts(ghosts, done);
}

// While the window is open it is always ready for a tap, so a finished or cancelled step goes back to picking.
function reset(message) {
    state.phase = "idle";
    if (ui.tool && ui.tool.id === TOOL_ID) ui.tool.cancel();
    highlight([]);
    state.a = state.b = state.plan = state.chain = null;
    state.extra = 0;
    state.message = message || "";
    if (getWindow()) {
        startPicking(state.message);
    } else {
        refresh();
    }
}

function cancelAll(message) {
    state.busy = true;
    clearPreview(function () {
        state.busy = false;
        reset(message);
    });
}

function startPicking(message) {
    cancelPickedState();
    state.phase = "pickA";
    state.message = message || "";
    activatePickTool();
    refresh();
}

function isPicking() {
    return state.phase === "pickA" || state.phase === "pickB";
}

// Other menus or gestures can switch the tool off; it comes back unless another tool took its place.
function activatePickTool() {
    ui.activateTool({
        id: TOOL_ID,
        cursor: "path_down",
        filter: ["footpath"],
        onDown: safely(onToolDown),
        onFinish: function () {
            if (!isPicking()) return;
            context.setTimeout(function () {
                if (isPicking() && getWindow() && ui.tool === null) activatePickTool();
            }, 200);
        }
    });
}

function cancelPickedState() {
    if (state.ghosts.length > 0) clearPreview();
    state.a = state.b = state.plan = state.chain = null;
    state.extra = 0;
    highlight([]);
}

function onToolDown(e) {
    if (!e.mapCoords || e.tileElementIndex === undefined) return;
    var x = Math.floor(e.mapCoords.x / 32), y = Math.floor(e.mapCoords.y / 32);
    var element = getFootpath(x, y, e.tileElementIndex);
    if (!element || element.isGhost) return;
    var endpoint = endpointFromElement(x, y, element);
    if (state.phase === "pickA") {
        state.a = endpoint;
        state.style = pathStyleFrom(element);
        state.phase = "pickB";
        state.message = "";
        highlight([endpoint]);
        refresh();
        return;
    }
    if (state.phase !== "pickB") return;
    if (endpoint.x === state.a.x && endpoint.y === state.a.y && endpoint.z === state.a.z) return;
    state.b = endpoint;
    state.phase = "planning";
    highlight([state.a, endpoint]);
    if (ui.tool) ui.tool.cancel();
    state.plan = planRoute(state.a, state.b, state.style);
    if (!state.plan) {
        reset(t("noRoute"));
        return;
    }
    state.phase = "preview";
    state.extra = 0;
    updatePreview();
}

function updatePreview() {
    state.busy = true;
    refresh();
    clearPreview(safely(function () {
        var result = lengthenPlan(state.plan, state.extra, state.depth);
        state.message = "";
        if (result.added < state.extra) {
            state.extra = result.added;
            state.message = t("noLonger");
        }
        state.chain = result.chain;
        var query = queryChainCost(state.chain, state.style);
        state.cost = query.cost;
        if (query.error) state.message = query.error;
        var removed = sceneryRemovedBy(state.chain);
        if (!state.message && removed > 0) state.message = t("removesScenery", removed);
        placeGhosts(state.chain, state.style, safely(function (ghosts) {
            state.ghosts = ghosts;
            state.busy = false;
            refresh();
        }));
    }));
}

function changeExtra(delta) {
    if (state.phase !== "preview" || state.busy) return;
    state.extra = Math.max(0, state.extra + delta);
    updatePreview();
}

function changeDepth(delta) {
    state.depth = Math.max(1, Math.min(10, state.depth + delta));
    if (state.phase === "preview" && !state.busy) {
        updatePreview();
    } else {
        refresh();
    }
}

function build() {
    if (state.phase !== "preview" || state.busy) return;
    state.busy = true;
    refresh();
    var chain = state.chain;
    clearPreview(function () {
        buildChain(chain, state.style, function (record) {
            state.busy = false;
            if (record.error) {
                ui.showError(t("buildFailed"), record.error);
                updatePreview();
                return;
            }
            var list = history();
            list.push(record);
            saveHistory(list);
            reset(t("built", record.tiles.length, money(record.cost)));
        });
    });
}

function undoLast() {
    var list = history();
    if (state.busy || list.length === 0) return;
    var record = list.pop();
    state.busy = true;
    refresh();
    undoBuild(record, function (refund) {
        saveHistory(list);
        state.busy = false;
        reset(t("undone", money(refund)));
    });
}

function openWindow() {
    var existing = getWindow();
    if (existing) {
        existing.bringToFront();
        return;
    }
    var y = 18;
    var widgets = [
        { type: "label", name: "status", x: 6, y: y, width: WIDTH - 12, height: 12, text: "" },
        { type: "button", name: "pick", x: 6, y: y + 16, width: WIDTH - 12, height: 22, text: t("pick"), onClick: safely(function () { startPicking(); }) },
        { type: "groupbox", x: 4, y: y + 42, width: WIDTH - 8, height: 84, text: t("route") },
        { type: "label", name: "length", x: 12, y: y + 56, width: WIDTH - 24, height: 12, text: "" },
        { type: "button", name: "less", x: 12, y: y + 72, width: 50, height: 24, text: "-", onClick: function () { changeExtra(-2); } },
        { type: "button", name: "more", x: WIDTH - 62, y: y + 72, width: 50, height: 24, text: "+", onClick: function () { changeExtra(2); } },
        { type: "label", x: 66, y: y + 78, width: WIDTH - 132, height: 12, text: t("lengthen"), textAlign: "centred" },
        { type: "label", x: 12, y: y + 106, width: 100, height: 12, text: t("turnWidth") },
        {
            type: "spinner", name: "depth", x: WIDTH - 102, y: y + 102, width: 90, height: 18, text: "",
            onDecrement: function () { changeDepth(-1); }, onIncrement: function () { changeDepth(1); }
        },
        { type: "label", name: "cost", x: 8, y: y + 132, width: WIDTH - 16, height: 12, text: "" },
        { type: "button", name: "build", x: 6, y: y + 148, width: (WIDTH - 16) / 2, height: 24, text: t("build"), onClick: safely(build) },
        { type: "button", name: "cancel", x: WIDTH / 2 + 2, y: y + 148, width: (WIDTH - 16) / 2, height: 24, text: t("cancel"), onClick: function () { cancelAll(); } },
        { type: "button", name: "undo", x: 6, y: y + 178, width: WIDTH - 12, height: 22, text: "", onClick: safely(undoLast) }
    ];
    ui.openWindow({
        classification: WINDOW_CLASS,
        title: t("title"),
        width: WIDTH,
        height: y + 206,
        widgets: widgets,
        onClose: function () {
            if (ui.tool && ui.tool.id === TOOL_ID) ui.tool.cancel();
            highlight([]);
            removeGhosts(state.ghosts);
            state.ghosts = [];
            state.phase = "idle";
            state.busy = false;
        }
    });
    refresh();
    startPicking();
}
registerPlugin({
    name: "Conectar caminos",
    version: "1.0.0",
    authors: ["Ezequiel"],
    type: "local",
    licence: "MIT",
    targetApiVersion: 124,
    main: function () {
        registerEdgesAction();
        if (typeof ui === "undefined") return;
        ui.registerMenuItem(t("title"), openWindow);
        context.subscribe("map.changed", function () {
            state.ghosts = [];
            ui.closeWindows(WINDOW_CLASS);
        });
    }
});
})();
