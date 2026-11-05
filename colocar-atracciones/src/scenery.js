var SCENERY_STEP = 8;
var FULL_TILE_FLAG = 1;
var SCENERY_WINDOW_CLASS = 18;
var REFUND_ACTION = "colocaratracciones_refund";
var SCENERY_ACTIONS = { smallsceneryplace: "small", largesceneryplace: "large" };
var ELEMENT_TYPES = { small: "small_scenery", large: "large_scenery" };

// The game charges a removal price, so this gives back the difference to undo a placement for free.
function registerRefundAction() {
    context.registerAction(REFUND_ACTION, function () {
        return {};
    }, function (e) {
        park.cash += e.args.amount;
        return {};
    });
}

function refund(amount, done) {
    if (amount <= 0) {
        if (done) done();
        return;
    }
    context.executeAction(REFUND_ACTION, { amount: amount }, function () {
        if (done) done();
    });
}

function isFullTile(item) {
    if (item.kind !== "small") return true;
    var object = objectManager.getObject("small_scenery", item.object);
    return !object || (object.flags & FULL_TILE_FLAG) !== 0;
}

// The tool reports the tile corner, so the exact spot is worked out from the screen, at the tile's ground height.
function exactMapCoords(e) {
    var v = ui.mainViewport, tile = { x: Math.floor(e.mapCoords.x / 32) * 32, y: Math.floor(e.mapCoords.y / 32) * 32 };
    if (!e.screenCoords || !v || v.left === undefined) return e.mapCoords;
    var surface = surfaceOf(tile.x / 32, tile.y / 32), z = surface ? surface.baseZ : 0, f = Math.pow(2, v.zoom);
    var a = v.left + e.screenCoords.x * f, b = 2 * (v.top + e.screenCoords.y * f + z);
    var inverse = [[(b - a) / 2, (b + a) / 2], [(-a - b) / 2, (b - a) / 2], [(a - b) / 2, (-a - b) / 2], [(a + b) / 2, (a - b) / 2]];
    var p = inverse[v.rotation & 3];
    return {
        x: Math.min(tile.x + 31, Math.max(tile.x, Math.floor(p[0]))),
        y: Math.min(tile.y + 31, Math.max(tile.y, Math.floor(p[1])))
    };
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
        if (item.kind === "small" && !isFullTile(item) && e.quadrant !== item.quadrant) continue;
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
