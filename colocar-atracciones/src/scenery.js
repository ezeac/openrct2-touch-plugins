var SCENERY_STEP = 8;
var FULL_TILE_FLAG = 1;
var ROTATABLE_FLAG = 1 << 3;
var DIAGONAL_FLAG = 1 << 8;
var HALF_TILE_FLAG = 1 << 24;
var THREE_QUARTERS_FLAG = 1 << 25;
var MIN_SCENERY_Z = 16;
var MAX_SCENERY_Z = 1784;
var SCENERY_WINDOW_CLASS = 18;
var REFUND_ACTION = "colocaratracciones_refund";
var SCENERY_ACTIONS = { smallsceneryplace: "small", largesceneryplace: "large" };
var ELEMENT_TYPES = { small: "small_scenery", large: "large_scenery" };

// The game charges a removal price, so this gives back the difference to undo a placement for free.
function registerRefundAction() {
    var check = function (e) {
        var amount = e.args.amount;
        return typeof amount === "number" && isFinite(amount) && amount >= 0 ? {} : { error: 1, errorMessage: "Invalid amount" };
    };
    context.registerAction(REFUND_ACTION, check, function (e) {
        var result = check(e);
        if (!result.error) park.cash += e.args.amount;
        return result;
    });
}

function refund(amount, done) {
    if (amount <= 0 || park.getFlag("noMoney")) {
        if (done) done();
        return;
    }
    context.executeAction(REFUND_ACTION, { amount: amount }, function () {
        if (done) done();
    });
}

function smallFlags(item) {
    var object = item.kind === "small" ? objectManager.getObject("small_scenery", item.object) : null;
    return object ? object.flags : FULL_TILE_FLAG;
}

function isFullTile(item) {
    return (smallFlags(item) & FULL_TILE_FLAG) !== 0;
}

// The game keeps quadrant 0 for these shapes, whatever corner was asked for.
function ignoresQuadrant(item) {
    var flags = smallFlags(item);
    if (!(flags & FULL_TILE_FLAG) && (flags & DIAGONAL_FLAG)) return false;
    return (flags & (DIAGONAL_FLAG | HALF_TILE_FLAG | THREE_QUARTERS_FLAG)) !== 0;
}

function canRotate(item) {
    return item.kind !== "small" || (smallFlags(item) & ROTATABLE_FLAG) !== 0;
}

function isHeightAllowed(ground, offset) {
    var z = ground + offset * SCENERY_STEP;
    return offset === 0 || (z >= MIN_SCENERY_Z && z <= MAX_SCENERY_Z);
}

// Ground height at an exact point of a tile, following the game's own formula for sloped land and water.
function groundAt(x, y) {
    var surface = surfaceOf(Math.floor(x / 32), Math.floor(y / 32));
    if (!surface) return 0;
    var xl = x & 31, yl = y & 31, slope = surface.slope & 15, steep = surface.slope & 16, height = surface.baseZ;
    var half = function (n) {
        return n < 0 ? Math.ceil(n / 2) : Math.floor(n / 2);
    };
    var corner = { 1: xl + yl - 32, 2: xl - yl, 4: 32 - yl - xl, 8: yl - xl }[slope];
    if (corner !== undefined && corner > 0) height += half(corner);
    var side = { 3: xl, 6: 32 - yl, 9: yl, 12: 32 - xl }[slope];
    if (side !== undefined) height += half(side);
    var down = { 7: [xl + 32 - yl, xl - yl], 11: [xl + yl, xl + yl - 32], 13: [32 - xl + yl, yl - xl], 14: [64 - xl - yl, 32 - yl - xl] }[slope];
    if (down) {
        if (steep) return Math.max(height + half(down[0]), surface.waterHeight);
        height += 16;
        if (down[1] < 0) height += half(down[1]);
    }
    var valley = { 10: Math.abs(xl - yl), 5: Math.abs(xl + yl - 32) }[slope];
    if (valley !== undefined) height += half(valley);
    return Math.max(height, surface.waterHeight);
}

// Screen position of a map point for each camera rotation, in view units.
function viewOf(x, y, z, rotation) {
    switch (rotation & 3) {
        case 0: return { x: y - x, y: (x + y) / 2 - z };
        case 1: return { x: -x - y, y: (y - x) / 2 - z };
        case 2: return { x: x - y, y: (-x - y) / 2 - z };
        default: return { x: x + y, y: (x - y) / 2 - z };
    }
}

// The tool reports the tile corner, so the exact spot is the point of the tile, at its ground height, drawn closest to the tap.
function exactMapCoords(e) {
    var v = ui.mainViewport, tx = Math.floor(e.mapCoords.x / 32) * 32, ty = Math.floor(e.mapCoords.y / 32) * 32;
    if (!e.screenCoords || !v || v.left === undefined) return e.mapCoords;
    var f = Math.pow(2, v.zoom), aimX = v.left + e.screenCoords.x * f, aimY = v.top + e.screenCoords.y * f;
    var best = { x: tx + 16, y: ty + 16 }, bestDistance = Infinity;
    for (var x = tx; x < tx + 32; x += 2) {
        for (var y = ty; y < ty + 32; y += 2) {
            var p = viewOf(x + 1, y + 1, groundAt(x + 1, y + 1), v.rotation);
            var distance = Math.pow(p.x - aimX, 2) + Math.pow(p.y - aimY, 2);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = { x: x + 1, y: y + 1 };
            }
        }
    }
    return best;
}

// Quarter of the tile under the tap, numbered as the game numbers small scenery quadrants.
function quadrantAt(mapCoords) {
    var right = mapCoords.x % 32 >= 16, down = mapCoords.y % 32 >= 16;
    if (!right) return down ? 1 : 0;
    return down ? 2 : 3;
}

function sceneryArgs(item, z, flags) {
    var args = {
        x: item.x * 32, y: item.y * 32, z: z, direction: item.direction, object: item.object,
        primaryColour: item.colours[0], secondaryColour: item.colours[1], tertiaryColour: item.colours[2], flags: flags
    };
    if (item.kind === "small") args.quadrant = item.quadrant;
    return args;
}

function placeAction(item) {
    return item.kind === "small" ? "smallsceneryplace" : "largesceneryplace";
}

// Height zero lets the game put the item on the ground, like its own tool does.
function sceneryZ(item, offset, ground) {
    return offset === 0 ? 0 : ground + offset * SCENERY_STEP;
}

function querySceneryPlace(item, z) {
    var result = null;
    ownQuery = true;
    try {
        context.queryAction(placeAction(item), sceneryArgs(item, z, 0), function (r) {
            result = r;
        });
    } finally {
        ownQuery = false;
    }
    return result;
}

function groundHeight(item) {
    var result = querySceneryPlace(item, 0);
    if (result && result.position) return result.position.z;
    var surface = surfaceOf(item.x, item.y);
    return surface ? surface.baseZ : 0;
}

// Our own placements reach the hooks a tick later, so they are recognised by their arguments.
var ownPlacements = {};

function placementKey(action, args) {
    return [action, args.x, args.y, args.object, args.quadrant || 0, args.flags & GHOST_FLAG].join(",");
}

function isOwnPlacement(action, args) {
    return !!ownPlacements[placementKey(action, args)];
}

function placeScenery(item, z, flags, done) {
    var action = placeAction(item), args = sceneryArgs(item, z, flags), key = placementKey(action, args);
    ownPlacements[key] = (ownPlacements[key] || 0) + 1;
    context.executeAction(action, args, function (r) {
        if (--ownPlacements[key] === 0) delete ownPlacements[key];
        if (done) done(r);
    });
}

// The element the game created for the item, found again because handles go stale after any action.
function findSceneryElement(item, ghost) {
    var elements = map.getTile(item.x, item.y).elements, best = null;
    for (var i = 0; i < elements.length; i++) {
        var e = elements[i];
        if (e.type !== ELEMENT_TYPES[item.kind] || e.object !== item.object || e.isGhost !== ghost) continue;
        if (item.kind === "large" && e.sequence !== 0) continue;
        if (item.kind === "small" && !isFullTile(item) && !ignoresQuadrant(item) && e.quadrant !== item.quadrant) continue;
        if (item.z === undefined || Math.abs(e.baseZ - item.z) < (best ? Math.abs(best.baseZ - item.z) : Infinity)) best = e;
    }
    return best ? { z: best.baseZ, quadrant: item.kind === "small" ? best.quadrant : 0, direction: best.direction } : null;
}

function removeScenery(item, z, flags, done) {
    var finish = function (r) {
        if (done) done(r);
    };
    if (item.kind === "small") {
        context.executeAction("smallsceneryremove", {
            x: item.x * 32, y: item.y * 32, z: z, object: item.object, quadrant: item.quadrant, flags: flags
        }, finish);
    } else {
        context.executeAction("largesceneryremove", {
            x: item.x * 32, y: item.y * 32, z: z, direction: item.direction, tileIndex: 0, flags: flags
        }, finish);
    }
}

function removeSceneryGhost(ghost, done) {
    if (!ghost) {
        if (done) done();
        return;
    }
    removeScenery(ghost, ghost.z, GHOST_FLAG, function () {
        if (done) done();
    });
}
