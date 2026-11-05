var GHOST_FLAG = 64;
var DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]];
var SEARCH_SLICE_MS = 25;
var SEARCH_BUDGET_MS = 6000;
var SEARCH_MARGIN = 16;
var STATION_GROUP = 2;
var GENTLE_SLOPES = [0, 2, 6];
var STEEP_SLOPES = [4, 8];
var GENTLE_BANKS = [0, 2, 4];
var DEFAULT_CLEARANCE = 48;
var SLOPE_EXTRA_CLEARANCE = 16;
var STEEP_EXTRA_CLEARANCE = 64;
var CHAIN_LIFT_FLAG = 1;
var INVERTED_FLAG = 2;
var EVER_OPENED_LIFECYCLE = 1 << 12;

function rotate(x, y, direction) {
    switch (direction & 3) {
        case 0: return { x: x, y: y };
        case 1: return { x: y, y: -x };
        case 2: return { x: -x, y: -y };
        default: return { x: -y, y: x };
    }
}

function stateKey(s) {
    return s.x + "," + s.y + "," + s.h + "," + s.dir + "," + s.slope + "," + s.bank;
}

function sameState(a, b) {
    return stateKey(a) === stateKey(b);
}

var DIAGONAL = 4;

/*
 * A connection point between two pieces: where the next piece starts, its height, slope and bank,
 * and its direction, which has the diagonal bit (4) set when it runs at 45 degrees.
 */
function startStateOf(origin, segment) {
    return {
        x: origin.x / 32, y: origin.y / 32, h: origin.z + segment.beginZ,
        dir: origin.direction | (segment.beginDirection & DIAGONAL), slope: segment.beginSlope, bank: segment.beginBank
    };
}

function originOf(state, segment) {
    return { x: state.x * 32, y: state.y * 32, z: state.h - segment.beginZ, direction: state.dir & 3 };
}

function fitsDirection(state, segment) {
    return (segment.beginDirection & DIAGONAL) === (state.dir & DIAGONAL);
}

// Like the game: the next piece starts one tile further only when the piece ends straight, not diagonally.
function endStateOf(state, segment) {
    var turn = state.dir & 3;
    var r = rotate(segment.endX, segment.endY, turn);
    var dir = (((segment.endDirection & 3) + turn) & 3) | (segment.endDirection & DIAGONAL);
    var step = dir & DIAGONAL ? [0, 0] : DIRS[dir];
    return {
        x: state.x + r.x / 32 + step[0],
        y: state.y + r.y / 32 + step[1],
        h: state.h - segment.beginZ + segment.endZ,
        dir: dir, slope: segment.endSlope, bank: segment.endBank
    };
}

function isPlain(slope, bank) {
    return bank === 0 && GENTLE_SLOPES.indexOf(slope) >= 0;
}

function isGentleBanked(slope, bank) {
    return GENTLE_BANKS.indexOf(bank) >= 0 && GENTLE_SLOPES.indexOf(slope) >= 0;
}

function isKnownSlope(slope) {
    return GENTLE_SLOPES.indexOf(slope) >= 0 || STEEP_SLOPES.indexOf(slope) >= 0;
}

function geometryKey(s) {
    return [s.beginDirection, s.beginZ, s.endZ, s.endX, s.endY, s.endDirection, s.beginSlope, s.endSlope, s.beginBank, s.endBank].join(",");
}

var FLAT_GROUP = 0;
var pieceGroups = {};

// The game places any piece on any ride, but only draws those its track style supports.
function supportsPiece(rideType, segment) {
    var support = RIDE_TRACK_SUPPORT[rideType];
    if (!support) return false;
    var mask = TRACK_PAINT_MASKS[support[0]];
    var digit = mask.length - 1 - (segment.type >> 2);
    if (digit < 0 || !((parseInt(mask.charAt(digit), 16) >> (segment.type & 3)) & 1)) return false;
    return segment.trackGroup === FLAT_GROUP || support[1].indexOf(segment.trackGroup) !== -1;
}

/*
 * Flat and gentle pieces without banking, plus pieces that lead from a banked or steep end into them,
 * grouped by shape: rides use different piece types for the same shape.
 */
function simplePieces(rideType) {
    if (pieceGroups[rideType]) return pieceGroups[rideType];
    var groups = {};
    context.getAllTrackSegments().forEach(function (s) {
        if ((s.beginDirection & 3) !== 0 || s.trackGroup === STATION_GROUP || !supportsPiece(rideType, s)) return;
        if (!isKnownSlope(s.beginSlope) || !isKnownSlope(s.endSlope)) return;
        var plainEnd = isPlain(s.beginSlope, s.beginBank) || isPlain(s.endSlope, s.endBank);
        if (!plainEnd && !(isGentleBanked(s.beginSlope, s.beginBank) && isGentleBanked(s.endSlope, s.endBank))) return;
        var key = geometryKey(s);
        if (!groups[key]) groups[key] = { segment: s, types: [] };
        groups[key].types.push(s.type);
    });
    pieceGroups[rideType] = Object.keys(groups).map(function (k) { return groups[k]; });
    return pieceGroups[rideType];
}

function occupiedTiles(state, segment) {
    var origin = originOf(state, segment);
    return segment.elements.map(function (e) {
        var r = rotate(e.x, e.y, state.dir & 3);
        return { x: state.x + r.x / 32, y: state.y + r.y / 32, z: origin.z + e.z };
    });
}

function trackArgs(ride, state, type, flags, placeFlags, segment) {
    var origin = originOf(state, segment || context.getTrackSegment(type));
    return {
        x: origin.x, y: origin.y, z: origin.z, direction: origin.direction, ride: ride.id, trackType: type,
        rideType: ride.type, brakeSpeed: 0, colour: 0, seatRotation: 4, trackPlaceFlags: placeFlags,
        isFromTrackDesign: false, flags: flags
    };
}

function query(action, args) {
    var result = null;
    context.queryAction(action, args, function (r) {
        result = r;
    });
    return result;
}

// Chain lift on climbs keeps the train from rolling back, when the ride allows it.
function placeFlagOptions(segment) {
    return segment.endZ > segment.beginZ && segment.allowsChainLift ? [CHAIN_LIFT_FLAG, 0] : [0];
}

function createFitter(ride) {
    var cache = {}, workingType = {};
    return function (state, group) {
        var key = stateKey(state) + "|" + geometryKey(group.segment);
        if (cache[key] !== undefined) return cache[key];
        var fit = null;
        var gKey = geometryKey(group.segment);
        var types = workingType[gKey] !== undefined ? [workingType[gKey]] : group.types;
        for (var i = 0; i < types.length && !fit; i++) {
            var options = placeFlagOptions(group.segment);
            for (var j = 0; j < options.length && !fit; j++) {
                var r = query("trackplace", trackArgs(ride, state, types[i], 0, options[j], group.segment));
                if (r && !r.error) {
                    fit = { type: types[i], placeFlags: options[j], cost: r.cost || 0 };
                    workingType[gKey] = types[i];
                }
            }
        }
        cache[key] = fit;
        return fit;
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
        if (items[parent].f <= items[i].f) break;
        var tmp = items[parent];
        items[parent] = items[i];
        items[i] = tmp;
        i = parent;
    }
};

Heap.prototype.pop = function () {
    var items = this.items, top = items[0], last = items.pop();
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

function heuristic(s, goal) {
    var dx = Math.abs(s.x - goal.x), dy = Math.abs(s.y - goal.y);
    var tiles = Math.max(dx, dy) + 0.41 * Math.min(dx, dy);
    return Math.max(tiles, Math.abs(s.h - goal.h) / 16);
}

function pieceCost(segment) {
    var shaped = segment.endDirection !== segment.beginDirection || segment.beginSlope !== 0 || segment.endSlope !== 0;
    return Math.max(1, segment.length / 32) + (shaped ? 0.3 : 0);
}

// Free height above a flat piece of this ride, read from its station; sloped pieces need more.
function baseClearance(ride) {
    var start = ride.stations.length > 0 ? ride.stations[0].start : null;
    var found = start && trackIndexOnTile(start.x / 32, start.y / 32, ride.id);
    if (!found) return DEFAULT_CLEARANCE;
    var element = map.getTile(found.x / 32, found.y / 32).elements[found.index];
    return element.clearanceZ - element.baseZ;
}

function clearanceOf(segment, base) {
    var slopes = [segment.beginSlope, segment.endSlope];
    if (STEEP_SLOPES.indexOf(slopes[0]) >= 0 || STEEP_SLOPES.indexOf(slopes[1]) >= 0) return base + STEEP_EXTRA_CLEARANCE;
    if (slopes[0] !== 0 || slopes[1] !== 0 || segment.beginZ !== segment.endZ) return base + SLOPE_EXTRA_CLEARANCE;
    return base;
}

function overlapsPath(node, tiles) {
    for (var n = node; n; n = n.parent) {
        if (!n.tiles) continue;
        for (var i = 0; i < n.tiles.length; i++) {
            for (var j = 0; j < tiles.length; j++) {
                var a = n.tiles[i], b = tiles[j];
                if (a.x === b.x && a.y === b.y && a.z < b.top && b.z < a.top) return true;
            }
        }
    }
    return false;
}

/*
 * Pieces from the open front end to the open back end. The search runs in short slices between game ticks,
 * so the game keeps running; it passes null when there is no route within the time budget or it is cancelled.
 */
function findClosingPieces(ride, from, to, done, isCancelled) {
    if (sameState(from, to)) return done([]);
    var fits = createFitter(ride);
    var clearance = baseClearance(ride);
    var groups = simplePieces(ride.type);
    var minX = Math.min(from.x, to.x) - SEARCH_MARGIN, maxX = Math.max(from.x, to.x) + SEARCH_MARGIN;
    var minY = Math.min(from.y, to.y) - SEARCH_MARGIN, maxY = Math.max(from.y, to.y) + SEARCH_MARGIN;
    var open = new Heap(), best = {};
    open.push({ s: from, g: 0, f: heuristic(from, to), parent: null, piece: null, tiles: null });
    best[stateKey(from)] = 0;
    var deadline = Date.now() + SEARCH_BUDGET_MS;
    var slice = function () {
        if (isCancelled && isCancelled()) return done(null);
        var sliceEnd = Date.now() + SEARCH_SLICE_MS;
        while (open.items.length > 0) {
            if (Date.now() > sliceEnd) {
                if (Date.now() > deadline) return done(null);
                context.setTimeout(slice, 0);
                return;
            }
            var node = open.pop();
            if (best[stateKey(node.s)] < node.g) continue;
            if (sameState(node.s, to)) {
                var pieces = [];
                for (var n = node; n.parent; n = n.parent) pieces.push(n.piece);
                return done(pieces.reverse());
            }
            for (var i = 0; i < groups.length; i++) {
                var seg = groups[i].segment;
                if (seg.beginSlope !== node.s.slope || seg.beginBank !== node.s.bank || !fitsDirection(node.s, seg)) continue;
                var next = endStateOf(node.s, seg);
                if (next.x < minX || next.x > maxX || next.y < minY || next.y > maxY) continue;
                var g = node.g + pieceCost(seg);
                var key = stateKey(next);
                if (best[key] !== undefined && best[key] <= g) continue;
                var tiles = occupiedTiles(node.s, seg), top = clearanceOf(seg, clearance);
                for (var t = 0; t < tiles.length; t++) tiles[t].top = tiles[t].z + top;
                if (overlapsPath(node, tiles)) continue;
                var fit = fits(node.s, groups[i]);
                if (!fit) continue;
                best[key] = g;
                open.push({
                    s: next, g: g, f: g + heuristic(next, to), parent: node, tiles: tiles,
                    piece: { state: node.s, type: fit.type, placeFlags: fit.placeFlags, cost: fit.cost }
                });
            }
        }
        done(null);
    };
    slice();
}

function trackElementAt(origin, segment, rideId) {
    var first = segment.elements[0];
    var r = rotate(first.x, first.y, origin.direction & 3);
    var x = (origin.x + r.x) / 32, y = (origin.y + r.y) / 32, z = origin.z + first.z;
    var elements = map.getTile(x, y).elements;
    for (var i = 0; i < elements.length; i++) {
        var e = elements[i];
        if (e.type === "track" && e.ride === rideId && e.trackType === segment.type && e.baseZ === z && !e.isGhost) return e;
    }
    return null;
}

// Everything needed to put a removed piece back exactly as it was.
function pieceRecord(origin, segment, rideId) {
    var e = trackElementAt(origin, segment, rideId);
    return {
        x: origin.x, y: origin.y, z: origin.z, direction: origin.direction, type: segment.type,
        removeZ: origin.z + segment.elements[0].z,
        placeFlags: e ? (e.hasChainLift ? CHAIN_LIFT_FLAG : 0) | (e.isInverted ? INVERTED_FLAG : 0) : 0,
        brakeSpeed: e && e.brakeBoosterSpeed !== null ? e.brakeBoosterSpeed : 0,
        colour: e && e.colourScheme !== null ? e.colourScheme : 0,
        seatRotation: e && e.seatRotation !== null ? e.seatRotation : 4
    };
}

function findAnyTrack(rideId) {
    var ride = map.getRide(rideId);
    var start = ride && ride.stations.length > 0 ? ride.stations[0].start : null;
    var candidates = [];
    if (start) candidates.push({ x: start.x / 32, y: start.y / 32 });
    for (var i = 0; i < candidates.length; i++) {
        var found = trackIndexOnTile(candidates[i].x, candidates[i].y, rideId);
        if (found) return found;
    }
    for (var x = 1; x < map.size.x - 1; x++) {
        for (var y = 1; y < map.size.y - 1; y++) {
            var any = trackIndexOnTile(x, y, rideId);
            if (any) return any;
        }
    }
    return null;
}

function trackIndexOnTile(x, y, rideId) {
    var elements = map.getTile(x, y).elements;
    for (var i = 0; i < elements.length; i++) {
        if (elements[i].type === "track" && elements[i].ride === rideId && !elements[i].isGhost) return { x: x * 32, y: y * 32, index: i };
    }
    return null;
}

// The two open ends of the circuit: the last piece going forward and the first going backward.
function findOpenEnds(rideId) {
    var found = findAnyTrack(rideId);
    if (!found) return { error: "noTrack" };
    var it = map.getTrackIterator({ x: found.x, y: found.y }, found.index);
    if (!it) return { error: "noTrack" };
    var startKey = JSON.stringify(it.position), guard = 0;
    while (it.next()) {
        if (JSON.stringify(it.position) === startKey || ++guard > 5000) return { error: "closed" };
    }
    var front = [];
    var walker = map.getTrackIterator({ x: found.x, y: found.y }, found.index);
    while (walker.next()) { }
    front.push({ origin: walker.position, segment: walker.segment });
    if (walker.previous()) front.push({ origin: walker.position, segment: walker.segment });
    var back = [];
    var backWalker = map.getTrackIterator({ x: found.x, y: found.y }, found.index);
    while (backWalker.previous()) { }
    back.push({ origin: backWalker.position, segment: backWalker.segment });
    if (backWalker.next()) back.push({ origin: backWalker.position, segment: backWalker.segment });
    return { front: front, back: back };
}

function isStation(segment) {
    return segment.trackGroup === STATION_GROUP;
}

// Variants in order: no removal, one piece off the front, off the back, off both.
function closingOptions(ends) {
    var f = ends.front, b = ends.back, options = [];
    var frontState = function (k) {
        return k === 0 ? endStateOf(startStateOf(f[0].origin, f[0].segment), f[0].segment) : startStateOf(f[0].origin, f[0].segment);
    };
    var backState = function (k) {
        return k === 0 ? startStateOf(b[0].origin, b[0].segment) : endStateOf(startStateOf(b[0].origin, b[0].segment), b[0].segment);
    };
    [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(function (c) {
        if (c[0] && (f.length < 2 || isStation(f[0].segment))) return;
        if (c[1] && (b.length < 2 || isStation(b[0].segment))) return;
        options.push({ removeFront: c[0] === 1, removeBack: c[1] === 1, from: frontState(c[0]), to: backState(c[1]) });
    });
    return options;
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

function removeCall(record, flags) {
    return { action: "trackremove", args: { x: record.x, y: record.y, z: record.removeZ, direction: record.direction, trackType: record.type, sequence: 0, flags: flags } };
}

function restoreCall(ride, record) {
    return {
        action: "trackplace", args: {
            x: record.x, y: record.y, z: record.z, direction: record.direction, ride: ride.id, trackType: record.type,
            rideType: ride.type, brakeSpeed: record.brakeSpeed, colour: record.colour, seatRotation: record.seatRotation,
            trackPlaceFlags: record.placeFlags, isFromTrackDesign: false, flags: 0
        }
    };
}

function pieceRecordFromPlan(ride, piece) {
    var segment = context.getTrackSegment(piece.type);
    var origin = originOf(piece.state, segment);
    return {
        x: origin.x, y: origin.y, z: origin.z, direction: origin.direction, type: piece.type,
        removeZ: origin.z + segment.elements[0].z, placeFlags: piece.placeFlags, brakeSpeed: 0, colour: 0, seatRotation: 4
    };
}

function errorOf(results) {
    for (var i = 0; i < results.length; i++) {
        if (results[i].error) return results[i].errorMessage || results[i].errorTitle || "error";
    }
    return null;
}

function costOf(results) {
    var total = 0;
    results.forEach(function (r) { if (!r.error) total += r.cost || 0; });
    return total;
}

function hasBeenOpened(ride) {
    return (ride.lifecycleFlags & EVER_OPENED_LIFECYCLE) !== 0;
}

// A ride that has been opened only refunds 70% of a removed piece, so putting it back costs the rest.
function removalLoss(ride, records) {
    if (!hasBeenOpened(ride)) return 0;
    var refund = 0;
    records.forEach(function (r) {
        var result = query("trackremove", removeCall(r, 0).args);
        if (result && !result.error) refund -= result.cost || 0;
    });
    return Math.round(refund * 3 / 7);
}

/*
 * Removes the end pieces an option needs, searches, and puts them back if there is no route.
 * On a ride that has been opened, removing ends needs allowLoss, because putting them back costs money.
 */
function planClosing(rideId, allowLoss, done, isCancelled) {
    var ends = findOpenEnds(rideId);
    if (ends.error) {
        done({ error: ends.error });
        return;
    }
    var ride = map.getRide(rideId);
    var options = closingOptions(ends);
    var tryOption = function (index) {
        if (index >= options.length) {
            done({ error: "noRoute" });
            return;
        }
        var option = options[index];
        var removed = [];
        if (option.removeFront) removed.push(pieceRecord(ends.front[0].origin, ends.front[0].segment, rideId));
        if (option.removeBack) removed.push(pieceRecord(ends.back[0].origin, ends.back[0].segment, rideId));
        if (removed.length > 0 && !allowLoss && hasBeenOpened(ride)) {
            var bothEnds = [pieceRecord(ends.front[0].origin, ends.front[0].segment, rideId), pieceRecord(ends.back[0].origin, ends.back[0].segment, rideId)];
            done({ error: "needsRemoval", loss: removalLoss(ride, bothEnds) });
            return;
        }
        executeAll(removed.map(function (r) { return removeCall(r, 0); }), function (removeResults) {
            if (errorOf(removeResults)) {
                restore(ride, removed.filter(function (r, i) { return !removeResults[i].error; }), function () {
                    tryOption(index + 1);
                });
                return;
            }
            findClosingPieces(ride, option.from, option.to, function (pieces) {
                if (!pieces) {
                    restore(ride, removed, function () {
                        if (isCancelled && isCancelled()) done({ error: "cancelled" });
                        else tryOption(index + 1);
                    });
                    return;
                }
                var cost = 0;
                pieces.forEach(function (p) { cost += p.cost; });
                done({ ride: ride, pieces: pieces, removed: removed, cost: cost, refund: -costOf(removeResults) });
            }, isCancelled);
        });
    };
    tryOption(0);
}

function restore(ride, removed, done) {
    executeAll(removed.map(function (r) { return restoreCall(ride, r); }), function () {
        if (done) done();
    });
}

function placementCalls(plan, flags) {
    return plan.pieces.map(function (p) {
        return { action: "trackplace", args: trackArgs(plan.ride, p.state, p.type, flags, p.placeFlags, context.getTrackSegment(p.type)) };
    });
}

function placeGhosts(plan, done) {
    executeAll(placementCalls(plan, GHOST_FLAG), function (results) {
        done(plan.pieces.filter(function (p, i) { return !results[i].error; }).map(function (p) {
            return pieceRecordFromPlan(plan.ride, p);
        }));
    });
}

function removeGhosts(ghosts, done) {
    executeAll(ghosts.map(function (g) { return removeCall(g, GHOST_FLAG); }), function () {
        if (done) done();
    });
}

// Builds the plan for real; on failure everything placed is removed and the removed ends are put back.
function buildClosing(plan, done) {
    executeAll(placementCalls(plan, 0), function (results) {
        var placed = plan.pieces.filter(function (p, i) { return !results[i].error; }).map(function (p) {
            return pieceRecordFromPlan(plan.ride, p);
        });
        var error = errorOf(results);
        if (error) {
            executeAll(placed.map(function (r) { return removeCall(r, 0); }), function () {
                restore(plan.ride, plan.removed, function () {
                    done({ error: error });
                });
            });
            return;
        }
        done({ rideId: plan.ride.id, placed: placed, removed: plan.removed, cost: costOf(results) });
    });
}

function cancelPlan(plan, done) {
    restore(plan.ride, plan.removed, done);
}

function undoClosing(record, done) {
    var ride = map.getRide(record.rideId);
    executeAll(record.placed.map(function (r) { return removeCall(r, 0); }), function (results) {
        restore(ride, record.removed, function () {
            done(-costOf(results));
        });
    });
}

function isCircuitClosed(rideId) {
    return findOpenEnds(rideId).error === "closed";
}
