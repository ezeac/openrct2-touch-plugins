(function () {
"use strict";
var TEXTS = {
    en: {
        title: "Place rides",
        internalError: "Place rides: internal error",
        cantBuild: "Cannot build here",
        idle: "Choose a ride or scenery in the game's menu.",
        pick: "Tap where the ride goes.",
        marked: "Tap elsewhere to move it, or Place.",
        entranceMarked: "Entrance marked: tap elsewhere or Place.",
        entrancePick: "Tap next to the ride: entrance.",
        exitMarked: "Exit marked: tap elsewhere or Place.",
        exitPick: "Tap next to the ride: exit.",
        cost: "Cost: {BLACK}{0}",
        costNone: "Cost: {BLACK}-",
        skip: "Skip",
        cancel: "Cancel",
        prepareFailed: "The ride could not be prepared",
        placeFailed: "The ride could not be placed",
        placedOpen: "Done, placed and opened for {0}.",
        mustTouch: "It must be next to the ride.",
        exitFailed: "The exit could not be placed",
        entranceFailed: "The entrance could not be placed",
        doneEntrances: "Done, with entrance and exit.",
        height: "Height",
        rotate: "Rotate",
        place: "Place",
        confirm: "Ask for confirmation when placing",
        confirmScenery: "Also for scenery (not walls)",
        sceneryPick: "Tap where the scenery goes.",
        sceneryMarked: "Tap elsewhere to move it, or Place.",
        sceneryPlaced: "Placed for {0}. Tap for another one.",
        sceneryPlacedFree: "Placed. Tap for another one.",
        sceneryFailed: "The scenery could not be placed",
        sceneryKept: "The game had already placed it. Tap for another.",
        copy: "Copy from map",
        move: "Move it one step that way",
        copyPick: "Tap a scenery item on the map.",
        copied: "Copied. Tap where it goes.",
        copyWall: "Walls: use the game's eyedropper.",
        copyGhost: "That is a preview. Tap a placed one.",
        copyNothing: "That is not scenery. Tap another.",
        copyUnavailable: "Not available in this park yet."
    },
    es: {
        title: "Colocar atracciones",
        internalError: "Colocar atracciones: error interno",
        cantBuild: "No se puede construir acá",
        idle: "Elegí una atracción o un decorado en el menú.",
        pick: "Tocá dónde va la atracción.",
        marked: "Tocá otro lugar para moverla o Colocar.",
        entranceMarked: "Entrada marcada: otro lugar o Colocar.",
        entrancePick: "Tocá al lado de la atracción: entrada.",
        exitMarked: "Salida marcada: otro lugar o Colocar.",
        exitPick: "Tocá al lado de la atracción: salida.",
        cost: "Costo: {BLACK}{0}",
        costNone: "Costo: {BLACK}-",
        skip: "Omitir",
        cancel: "Cancelar",
        prepareFailed: "No se pudo preparar la atracción",
        placeFailed: "No se pudo colocar la atracción",
        placedOpen: "Listo, se colocó y se abrió por {0}.",
        mustTouch: "Tiene que ir pegada a la atracción.",
        exitFailed: "No se pudo colocar la salida",
        entranceFailed: "No se pudo colocar la entrada",
        doneEntrances: "Listo, con entrada y salida.",
        height: "Altura",
        rotate: "Rotar",
        place: "Colocar",
        confirm: "Pedir confirmación al colocar",
        confirmScenery: "También en decorados (no muros)",
        sceneryPick: "Tocá dónde va el decorado.",
        sceneryMarked: "Tocá otro lugar para moverlo o Colocar.",
        sceneryPlaced: "Colocado por {0}. Tocá para otro.",
        sceneryPlacedFree: "Colocado. Tocá para otro.",
        sceneryFailed: "No se pudo colocar el decorado",
        sceneryKept: "El juego ya lo había colocado. Tocá para otro.",
        copy: "Copiar del mapa",
        move: "Moverlo un paso hacia ese lado",
        copyPick: "Tocá un decorado del mapa.",
        copied: "Copiado. Tocá dónde va.",
        copyWall: "Muros: usá el gotero del juego.",
        copyGhost: "Es una vista previa. Tocá uno colocado.",
        copyNothing: "Eso no es un decorado. Tocá otro.",
        copyUnavailable: "Todavía no está disponible en el parque."
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
        // As a function, so a "$" in the value is not read as a replacement pattern.
        var value = arguments[i];
        text = text.replace("{" + (i - 1) + "}", function () {
            return value;
        });
    }
    return text;
}
var GHOST_FLAG = 64;
var FLAT_RIDE_TRACK_GROUP = 59;
var HEIGHT_STEP = 16;
var DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]];

function isFlatRidePiece(trackType) {
    var segment = context.getTrackSegment(trackType);
    return segment !== null && segment.trackGroup === FLAT_RIDE_TRACK_GROUP;
}

function rotate(x, y, direction) {
    switch (direction & 3) {
        case 0: return { x: x, y: y };
        case 1: return { x: y, y: -x };
        case 2: return { x: -x, y: -y };
        default: return { x: -y, y: x };
    }
}

// Tiles covered by the piece, in tile coordinates.
function footprint(mark) {
    var elements = context.getTrackSegment(mark.trackType).elements;
    return elements.map(function (e) {
        var r = rotate(e.x, e.y, mark.direction);
        return { x: mark.x + r.x / 32, y: mark.y + r.y / 32 };
    });
}

function surfaceOf(x, y) {
    var elements = map.getTile(x, y).elements;
    for (var i = 0; i < elements.length; i++) {
        if (elements[i].type === "surface") return elements[i];
    }
    return null;
}

function highestGround(tiles) {
    var z = 0;
    tiles.forEach(function (t) {
        var s = surfaceOf(t.x, t.y);
        if (s) z = Math.max(z, s.baseZ + (s.slope ? HEIGHT_STEP : 0), s.waterHeight || 0);
    });
    return z;
}

function trackArgs(mark, z, flags) {
    return {
        x: mark.x * 32,
        y: mark.y * 32,
        z: z,
        direction: mark.direction,
        ride: mark.ride,
        trackType: mark.trackType,
        rideType: mark.rideType,
        brakeSpeed: 0,
        colour: mark.colour,
        seatRotation: mark.seatRotation,
        trackPlaceFlags: 0,
        isFromTrackDesign: false,
        flags: flags
    };
}

// Queries also reach the placement hook, which must let our own ones through.
var ownQuery = false;

function queryPlace(mark, z) {
    var result = null;
    ownQuery = true;
    try {
        context.queryAction("trackplace", trackArgs(mark, z, 0), function (r) {
            result = r;
        });
    } finally {
        ownQuery = false;
    }
    return result;
}

function errorText(result) {
    return result.errorMessage || result.errorTitle || t("cantBuild");
}

// The lowest height the game accepts at this spot, like the game's own placement does.
function baseHeight(mark) {
    var start = highestGround(footprint(mark));
    for (var z = Math.max(0, start - HEIGHT_STEP); z <= start + 4 * HEIGHT_STEP; z += 8) {
        var result = queryPlace(mark, z);
        if (result && !result.error) return z;
    }
    return start;
}

function removeTrackGhost(ghost, done) {
    if (!ghost) {
        if (done) done();
        return;
    }
    context.executeAction("trackremove", {
        x: ghost.x * 32, y: ghost.y * 32, z: ghost.z, direction: ghost.direction,
        trackType: ghost.trackType, sequence: 0, flags: GHOST_FLAG
    }, function () {
        if (done) done();
    });
}

function placeTrack(mark, z, flags, done) {
    context.executeAction("trackplace", trackArgs(mark, z, flags), done);
}

// Screen-up direction on the map for each camera rotation: a tap aimed at something raised lands that way on the ground.
var VIEW_UP = [[1, 1], [-1, 1], [-1, -1], [1, -1]];

// The spot on a given tile, if it is right next to the ride.
function entranceSpotOn(x, y, rideTiles) {
    var spot = null, taken = rideTiles.some(function (t) {
        return t.x === x && t.y === y;
    });
    rideTiles.forEach(function (t) {
        for (var d = 0; d < 4 && !taken && !spot; d++) {
            if (t.x - DIRS[d][0] === x && t.y - DIRS[d][1] === y) spot = { x: x, y: y, direction: d };
        }
    });
    return spot;
}

// The free spot next to the ride closest to the tap, after undoing the shift caused by the ride's height.
function entranceSpot(mapCoords, rideTiles, rideZ, rotation) {
    var tx = Math.floor(mapCoords.x / 32), ty = Math.floor(mapCoords.y / 32);
    var surface = surfaceOf(tx, ty);
    var lift = Math.max(0, rideZ - (surface ? surface.baseZ : 0));
    var up = VIEW_UP[rotation & 3];
    var aimX = (mapCoords.x - up[0] * lift) / 32, aimY = (mapCoords.y - up[1] * lift) / 32;
    var taken = {};
    rideTiles.forEach(function (t) {
        taken[t.x + "," + t.y] = true;
    });
    var best = null, bestDistance = 2.5;
    rideTiles.forEach(function (t) {
        for (var d = 0; d < 4; d++) {
            var x = t.x - DIRS[d][0], y = t.y - DIRS[d][1];
            if (taken[x + "," + y]) continue;
            var distance = Math.sqrt(Math.pow(x + 0.5 - aimX, 2) + Math.pow(y + 0.5 - aimY, 2));
            if (distance < bestDistance) {
                bestDistance = distance;
                best = { x: x, y: y, direction: d };
            }
        }
    });
    return best;
}

function entranceArgs(spot, ride, isExit, flags) {
    return { x: spot.x * 32, y: spot.y * 32, direction: spot.direction, ride: ride, station: 0, isExit: isExit, flags: flags };
}

function removeEntranceGhost(ghost, done) {
    if (!ghost) {
        if (done) done();
        return;
    }
    context.executeAction("rideentranceexitremove", {
        x: ghost.x * 32, y: ghost.y * 32, ride: ghost.ride, station: 0, isExit: ghost.isExit, flags: GHOST_FLAG
    }, function () {
        if (done) done();
    });
}

function needsEntrances(rideId) {
    var ride = map.getRide(rideId);
    return ride !== null && ride.classification === "ride";
}

function createRide(template, done) {
    context.executeAction("ridecreate", {
        rideType: template.rideType, rideObject: template.rideObject, entranceObject: 0,
        colour1: 0, colour2: 0, inspectionInterval: 0
    }, done);
}

// The ride is recreated by the plugin, so it gets the colours the game had picked for it.
function copyColours(rideId, template) {
    var changes = [];
    if (template.track) {
        changes.push([0, template.track.main], [1, template.track.additional], [2, template.track.supports]);
    }
    if (template.vehicle) {
        changes.push([3, template.vehicle.body], [4, template.vehicle.trim], [5, template.vehicle.tertiary]);
    }
    changes.forEach(function (c) {
        context.executeAction("ridesetappearance", { ride: rideId, type: c[0], value: c[1], index: 0 });
    });
}

function demolishRide(rideId, done) {
    context.executeAction("ridedemolish", { ride: rideId, modifyType: 0 }, function () {
        if (done) done();
    });
}

function removeTrack(piece, done) {
    context.executeAction("trackremove", {
        x: piece.x, y: piece.y, z: piece.z, direction: piece.direction, trackType: piece.trackType, sequence: 0
    }, function () {
        done();
    });
}

// The game can give two new rides the same default name, so the next free number is set explicitly.
function uniqueRideName(rideId, done) {
    var ride = map.getRide(rideId);
    var base = ride.name.replace(/\s+\d+$/, "");
    var used = {};
    map.rides.forEach(function (r) {
        if (r.id !== rideId) used[r.name] = true;
    });
    if (!used[ride.name]) {
        if (done) done();
        return;
    }
    var n = 1;
    while (used[base + " " + n]) n++;
    context.executeAction("ridesetname", { ride: rideId, name: base + " " + n }, function () {
        if (done) done();
    });
}

// The piece the game itself placed for a ride, if any.
function placedTrackOf(rideId) {
    var ride = map.getRide(rideId);
    var start = ride && ride.stations.length > 0 ? ride.stations[0].start : null;
    if (!start) return null;
    var elements = map.getTile(start.x / 32, start.y / 32).elements;
    for (var i = 0; i < elements.length; i++) {
        var e = elements[i];
        if (e.type === "track" && e.ride === rideId && !e.isGhost) {
            return { x: start.x, y: start.y, z: e.baseZ, direction: e.direction, trackType: e.trackType };
        }
    }
    return null;
}
var SCENERY_STEP = 8;
var FULL_TILE_FLAG = 1;
var ROTATABLE_FLAG = 1 << 3;
var DIAGONAL_FLAG = 1 << 8;
var HALF_TILE_FLAG = 1 << 24;
var THREE_QUARTERS_FLAG = 1 << 25;
var MIN_SCENERY_Z = 16;
var MAX_SCENERY_Z = 1784;
var SCENERY_WINDOW_CLASS = 18;
// Centre of each quarter of a tile, in the order of quadrantAt.
var SCENERY_QUADRANT_POINTS = [[8, 8], [8, 24], [24, 24], [24, 8]];
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
var WINDOW_CLASS = "colocar-atracciones";
var TOOL_ID = "colocar-atracciones-lugar";
var ENABLED_KEY = "colocar-atracciones.confirmar";
var SCENERY_ENABLED_KEY = "colocar-atracciones.decorados";
var RIDE_CONSTRUCTION_CLASS = 13;
var WIDTH = 220;
// Screen direction of each arrow and the game's own diagonal arrow image for it, the one the footpath window uses.
var ARROWS = [
    { name: "moveNW", aim: [-1, -1], image: 5638 }, { name: "moveNE", aim: [1, -1], image: 5635 },
    { name: "moveSW", aim: [-1, 1], image: 5637 }, { name: "moveSE", aim: [1, 1], image: 5636 }
];

var state = {
    phase: "idle",
    busy: false,
    mark: null,
    base: 0,
    offset: 0,
    ghost: null,
    cost: null,
    error: null,
    entrance: null,
    entranceGhost: null,
    copyReturn: null,
    kind: "ride",
    item: null,
    ground: 0,
    sceneryGhost: null,
    message: ""
};

// Rides the game created and the plugin already took over, and rides the plugin created itself.
var handledRides = {};
var ownRides = {};
var expectedPlace = null;
var pendingCapture = null;
var pendingScenery = null;

function enabled() {
    return context.sharedStorage.get(ENABLED_KEY, true);
}

function sceneryEnabled() {
    return context.sharedStorage.get(SCENERY_ENABLED_KEY, true);
}

function isScenery() {
    return state.kind === "scenery";
}

// Plugin errors only reach the console, which is not visible on a phone.
function safely(fn) {
    return function () {
        try {
            return fn.apply(this, arguments);
        } catch (e) {
            state.busy = false;
            ui.showError(t("internalError"), String(e && e.message || e));
            console.log("colocar-atracciones: " + (e && e.stack || e));
        }
    };
}

function money(value) {
    return context.formatString("{CURRENCY2DP}", value);
}

function getWindow() {
    return ui.getWindow(WINDOW_CLASS);
}

function setWidget(name, props) {
    var w = getWindow();
    if (!w) return;
    var widget = w.findWidget(name);
    for (var key in props) widget[key] = props[key];
}

function currentZ() {
    if (isScenery()) return sceneryZ(state.item, state.offset, state.ground);
    return state.base + state.offset * HEIGHT_STEP;
}

function refresh() {
    if (!getWindow()) return;
    var marked = state.phase === "marked";
    var placingEntrance = state.phase === "entrance" || state.phase === "exit";
    var texts = {
        idle: t("idle"),
        pick: isScenery() ? t("sceneryPick") : t("pick"),
        marked: state.error || (isScenery() ? t("sceneryMarked") : t("marked")),
        entrance: state.entrance ? t("entranceMarked") : t("entrancePick"),
        exit: state.entrance ? t("exitMarked") : t("exitPick"),
        copy: t("copyPick")
    };
    setWidget("status", { text: state.message || texts[state.phase] });
    setWidget("height", { text: marked ? "{BLACK}" + (state.offset >= 0 ? "+" : "") + state.offset : "{BLACK}-" });
    setWidget("cost", { text: marked && state.cost !== null ? t("cost", money(state.cost)) : t("costNone") });
    var scenery = isScenery() && state.item;
    var limited = function (delta) {
        return scenery && !isHeightAllowed(state.ground, state.offset + delta);
    };
    setWidget("lower", { isDisabled: !marked || state.busy || limited(-1) });
    setWidget("raise", { isDisabled: !marked || state.busy || limited(1) });
    setWidget("rotate", { isDisabled: !marked || state.busy || (scenery && !canRotate(state.item)) });
    var movable = (marked || (placingEntrance && state.entrance !== null)) && !state.busy;
    ARROWS.forEach(function (arrow) {
        setWidget(arrow.name, { isDisabled: !movable });
    });
    setWidget("copy", { isDisabled: state.busy || ["idle", "pick", "marked"].indexOf(state.phase) < 0 });
    var ghost = isScenery() ? state.sceneryGhost : state.ghost;
    var canPlace = (marked && !state.error && ghost !== null) || (placingEntrance && state.entrance !== null);
    setWidget("place", { isDisabled: !canPlace || state.busy });
    setWidget("cancel", { isDisabled: state.phase === "idle" || state.busy, text: placingEntrance ? t("skip") : t("cancel") });
    setWidget("enabled", { isChecked: enabled() });
    setWidget("sceneryEnabled", { isChecked: sceneryEnabled() });
}

function cancelOwnTool() {
    if (ui.tool && ui.tool.id === TOOL_ID) ui.tool.cancel();
}

function closeRideConstruction() {
    for (var i = ui.windows - 1; i >= 0; i--) {
        var w = ui.getWindow(i);
        if (w && w.classification === RIDE_CONSTRUCTION_CLASS) w.close();
    }
}

function clearGhosts(done) {
    var trackGhost = state.ghost, entranceGhost = state.entranceGhost, sceneryGhost = state.sceneryGhost;
    state.ghost = null;
    state.entranceGhost = null;
    state.sceneryGhost = null;
    removeTrackGhost(trackGhost, function () {
        removeEntranceGhost(entranceGhost, function () {
            removeSceneryGhost(sceneryGhost, done);
        });
    });
}

// A ride chosen in the menu but not placed yet, also while copying from the map.
function pendingRide() {
    var phase = state.phase === "copy" ? state.copyReturn : state.phase;
    return !isScenery() && state.mark && (phase === "pick" || phase === "marked") ? state.mark.ride : -1;
}

function reset(message) {
    cancelOwnTool();
    clearGhosts();
    var ride = pendingRide();
    if (ride >= 0) demolishRide(ride);
    state.phase = "idle";
    state.kind = "ride";
    state.item = null;
    state.mark = null;
    state.entrance = null;
    state.busy = false;
    state.message = message || "";
    refresh();
}

function updateGhost() {
    if (isScenery()) return updateSceneryGhost();
    state.busy = true;
    refresh();
    clearGhosts(safely(function () {
        var z = currentZ(), mark = state.mark;
        var result = queryPlace(mark, z);
        state.error = result && result.error ? errorText(result) : null;
        state.cost = result && !result.error ? result.cost : null;
        if (state.error) {
            state.busy = false;
            refresh();
            return;
        }
        placeTrack(mark, z, GHOST_FLAG, safely(function (r) {
            if (!r.error && state.mark === mark) {
                state.ghost = { x: mark.x, y: mark.y, z: z, direction: mark.direction, trackType: mark.trackType };
            } else if (!r.error) {
                removeTrackGhost({ x: mark.x, y: mark.y, z: z, direction: mark.direction, trackType: mark.trackType });
            }
            state.busy = false;
            refresh();
        }));
    }));
}

function markAt(x, y) {
    state.mark.x = x;
    state.mark.y = y;
    state.phase = "marked";
    state.message = "";
    state.base = baseHeight(state.mark);
    updateGhost();
}

function isRideConstructionOpen() {
    for (var i = 0; i < ui.windows; i++) {
        var w = ui.getWindow(i);
        if (w && w.classification === RIDE_CONSTRUCTION_CLASS) return true;
    }
    return false;
}

function updateSceneryGhost() {
    var item = state.item;
    if (!isHeightAllowed(state.ground, state.offset)) state.offset = 0;
    state.busy = true;
    refresh();
    clearGhosts(safely(function () {
        if (state.item !== item) {
            state.busy = false;
            return;
        }
        var z = currentZ();
        var result = querySceneryPlace(item, z);
        state.error = result && result.error ? errorText(result) : null;
        state.cost = result && !result.error ? result.cost : null;
        if (state.error) {
            state.busy = false;
            refresh();
            return;
        }
        placeScenery(item, z, GHOST_FLAG, safely(function (r) {
            var found = !r.error && findSceneryElement(sceneryAt(item, r, z), true);
            var ghost = found ? copyItem(item, { z: found.z, quadrant: found.quadrant }) : null;
            if (ghost && state.item === item && state.phase === "marked") {
                state.sceneryGhost = ghost;
            } else if (ghost) {
                removeSceneryGhost(ghost);
            }
            state.busy = false;
            refresh();
        }));
    }));
}

function copyItem(item, changes) {
    var copy = {};
    for (var key in item) copy[key] = item[key];
    for (var change in changes) copy[change] = changes[change];
    return copy;
}

// The height the game used: the one asked for, or the ground it chose when asked for zero.
function sceneryAt(item, result, z) {
    return copyItem(item, { z: z !== 0 ? z : result.position ? result.position.z : undefined });
}

function markScenery(mapCoords) {
    var item = state.item;
    markSceneryAt(Math.floor(mapCoords.x / 32), Math.floor(mapCoords.y / 32), isFullTile(item) ? item.quadrant : quadrantAt(mapCoords));
}

function markSceneryAt(x, y, quadrant) {
    var item = state.item;
    item.x = x;
    item.y = y;
    item.quadrant = quadrant;
    state.ground = groundHeight(item);
    state.phase = "marked";
    state.message = "";
    updateGhost();
}

function isSceneryWindowOpen() {
    for (var i = 0; i < ui.windows; i++) {
        var w = ui.getWindow(i);
        if (w && w.classification === SCENERY_WINDOW_CLASS) return true;
    }
    return false;
}

// Small and large scenery chosen in the game's menu. Walls are left alone, so dragging a fence still works.
function isNativeScenery(e) {
    if (!SCENERY_ACTIONS[e.action] || !sceneryEnabled() || ownQuery || isOwnPlacement(e.action, e.args)) return false;
    if (network.mode !== "none" && e.player !== network.currentPlayer.id) return false;
    if (state.phase === "entrance" || state.phase === "exit") return false;
    return isSceneryWindowOpen() && (!ui.tool || ui.tool.id === "");
}

// The game only reports placements that succeed, so a refused tap never reaches the plugin.
// One tap can place several items when the game scatters them, and all of them are undone.
function captureScenery(e, placed) {
    if (pendingScenery) {
        if (placed) pendingScenery.placed.push({ args: e.args, result: e.result });
        return;
    }
    pendingScenery = {
        item: {
            kind: SCENERY_ACTIONS[e.action], x: e.args.x / 32, y: e.args.y / 32, direction: e.args.direction || 0,
            object: e.args.object, quadrant: e.args.quadrant || 0,
            colours: [e.args.primaryColour, e.args.secondaryColour, e.args.tertiaryColour]
        },
        placed: placed ? [{ args: e.args, result: e.result }] : []
    };
    context.setTimeout(safely(takeOverScenery), 0);
}

// A tap that got through is undone at no cost, so the player can still adjust the item before it counts.
// If the game refuses to remove it, it stays as the game built it and is not refunded.
function undoNativeScenery(item, placed, done) {
    var at = copyItem(item, { x: placed.args.x / 32, y: placed.args.y / 32, quadrant: placed.args.quadrant || 0 });
    var found = findSceneryElement(sceneryAt(at, placed.result, placed.args.z), false);
    if (!found) return done(false);
    removeScenery(copyItem(at, { quadrant: found.quadrant }), found.z, 0, function (r) {
        if (r.error) return done(false);
        refund((placed.result.cost || 0) + (r.cost || 0), function () {
            done(true);
        });
    });
}

function undoAllNative(item, placedList, done, kept) {
    kept = kept || 0;
    if (placedList.length === 0) return done(kept);
    undoNativeScenery(item, placedList[0], function (undone) {
        undoAllNative(item, placedList.slice(1), done, kept + (undone ? 0 : 1));
    });
}

function takeOverScenery() {
    var captured = pendingScenery;
    pendingScenery = null;
    var previousRide = pendingRide();
    cancelOwnTool();
    clearGhosts();
    state.busy = true;
    var start = safely(function (kept) {
        if (previousRide >= 0) demolishRide(previousRide);
        cancelNativeTool();
        state.busy = false;
        state.kind = "scenery";
        state.item = captured.item;
        state.mark = null;
        state.offset = 0;
        state.error = null;
        openWindow();
        var first = captured.placed[0];
        if (first && !kept) {
            markSceneryAt(first.args.x / 32, first.args.y / 32, captured.item.quadrant);
        } else {
            state.phase = "pick";
            state.message = kept ? t("sceneryKept") : "";
            refresh();
        }
        pickLocation();
    });
    if (captured.placed.length > 0) {
        undoAllNative(captured.item, captured.placed, start);
    } else {
        start(0);
    }
}

function cancelNativeTool() {
    if (ui.tool && ui.tool.id !== TOOL_ID) ui.tool.cancel();
}

// Only a ride just chosen in the game's menu: other plugins (like Scenery Manager) also preview existing rides.
function isNewFlatRide(args, alreadyPlaced) {
    if (!enabled() || args.isFromTrackDesign || ownRides[args.ride] || handledRides[args.ride]) return false;
    if (!isFlatRidePiece(args.trackType) || !isRideConstructionOpen()) return false;
    var ride = map.getRide(args.ride);
    return ride !== null && (alreadyPlaced || ride.stations[0].start === null);
}

// The game previews the ride under the cursor as soon as it is chosen, before any tap places it.
function onActionQuery(e) {
    if (isNativeScenery(e)) {
        if (e.args.flags & GHOST_FLAG) captureScenery(e, false);
        return;
    }
    if (e.action !== "trackplace" || ownQuery || !(e.args.flags & GHOST_FLAG) || !isNewFlatRide(e.args, false)) return;
    capture(e.args, null);
}

// If a tap still got through, the plugin takes back that placement and lets the player adjust it.
function onActionExecute(e) {
    // The game reuses the number of a demolished ride, so a new ride with it must not look already handled.
    if (e.action === "ridedemolish" && e.args.modifyType === 0) {
        delete ownRides[e.args.ride];
        delete handledRides[e.args.ride];
        return;
    }
    if (isNativeScenery(e)) {
        captureScenery(e, !(e.args.flags & GHOST_FLAG));
        return;
    }
    if (e.action !== "trackplace" || (e.args.flags & GHOST_FLAG) || !isNewFlatRide(e.args, true)) return;
    if (expectedPlace && e.args.x === expectedPlace.x && e.args.y === expectedPlace.y) return;
    capture(e.args, e.args);
}

function capture(args, placed) {
    handledRides[args.ride] = true;
    if (pendingCapture) return;
    var nativeRide = map.getRide(args.ride);
    pendingCapture = {
        template: {
            rideType: args.rideType,
            rideObject: nativeRide.object.index,
            track: nativeRide.colourSchemes[0],
            vehicle: nativeRide.vehicleColours[0]
        },
        mark: {
            x: args.x / 32, y: args.y / 32, direction: args.direction, ride: -1, trackType: args.trackType,
            rideType: args.rideType, colour: args.colour, seatRotation: args.seatRotation
        },
        placed: placed,
        nativeRide: args.ride
    };
    context.setTimeout(safely(takeOver), 0);
}

function takeOver() {
    var captured = pendingCapture;
    pendingCapture = null;
    // With a finger the game can place the ride in the same frame it is captured, before the plugin closes its tool.
    if (!captured.placed) captured.placed = placedTrackOf(captured.nativeRide);
    if (captured.placed) {
        captured.mark.x = captured.placed.x / 32;
        captured.mark.y = captured.placed.y / 32;
        captured.mark.direction = captured.placed.direction;
    }
    var previous = pendingRide();
    cancelOwnTool();
    clearGhosts();
    state.phase = "idle";
    state.kind = "ride";
    state.item = null;
    state.mark = null;
    state.busy = true;
    var afterRemoval = safely(function () {
        closeRideConstruction();
        if (previous >= 0) demolishRide(previous);
        createRide(captured.template, safely(function (r) {
            state.busy = false;
            if (r.error) {
                ui.showError(t("prepareFailed"), errorText(r));
                refresh();
                return;
            }
            ownRides[r.ride] = true;
            copyColours(r.ride, captured.template);
            uniqueRideName(r.ride);
            state.mark = captured.mark;
            state.mark.ride = r.ride;
            state.offset = 0;
            openWindow();
            if (captured.placed) {
                markAt(captured.mark.x, captured.mark.y);
            } else {
                state.phase = "pick";
                state.message = "";
                refresh();
            }
            pickLocation();
        }));
    });
    if (captured.placed) {
        removeTrack(captured.placed, afterRemoval);
    } else {
        afterRemoval();
    }
}

function isPicking() {
    return ["pick", "marked", "entrance", "exit"].indexOf(state.phase) >= 0;
}

// Every tap moves the mark until Colocar is pressed; if another menu switches the tool off, it comes back.
function pickLocation() {
    var forRide = state.phase === "pick" || state.phase === "marked";
    ui.activateTool({
        id: TOOL_ID,
        cursor: forRide ? "cross_hair" : "entrance_down",
        filter: ["terrain", "footpath", "water"],
        onDown: safely(function (e) {
            if (!e.mapCoords || state.busy) return;
            var x = Math.floor(e.mapCoords.x / 32), y = Math.floor(e.mapCoords.y / 32);
            if (forRide && isScenery()) {
                markScenery(exactMapCoords(e));
            } else if (forRide) {
                markAt(x, y);
            } else {
                markEntrance(e.mapCoords);
            }
        }),
        onFinish: function () {
            if (!isPicking()) return;
            context.setTimeout(function () {
                if (isPicking() && getWindow() && ui.tool === null) pickLocation();
            }, 200);
        }
    });
}

// The next tap on a scenery item chooses it, like the game's eyedropper; what was being placed stays until then.
function startCopy() {
    if (state.busy || ["idle", "pick", "marked"].indexOf(state.phase) < 0) return;
    state.copyReturn = state.phase;
    state.phase = "copy";
    state.message = "";
    refresh();
    copyTool();
}

function copyTool() {
    ui.activateTool({
        id: TOOL_ID,
        cursor: "picker",
        filter: ["scenery", "large_scenery", "wall"],
        onDown: safely(function (e) {
            if (!state.busy) copyFrom(e);
        }),
        onFinish: function () {
            if (state.phase !== "copy") return;
            context.setTimeout(function () {
                if (state.phase === "copy" && getWindow() && ui.tool === null) copyTool();
            }, 200);
        }
    });
}

function copyRefused(message) {
    state.message = message;
    refresh();
}

function isAvailable(kind, index) {
    return context.mode === "scenario_editor" || cheats.ignoreResearchStatus || park.research.isObjectResearched(ELEMENT_TYPES[kind], index);
}

function copyFrom(e) {
    var tile = e.mapCoords && e.tileElementIndex !== undefined ? map.getTile(Math.floor(e.mapCoords.x / 32), Math.floor(e.mapCoords.y / 32)) : null;
    var element = tile ? tile.elements[e.tileElementIndex] : null;
    if (element && element.isGhost) return copyRefused(t("copyGhost"));
    if (element && element.type === "wall") return copyRefused(t("copyWall"));
    var kind = element && element.type === "small_scenery" ? "small" : element && element.type === "large_scenery" ? "large" : null;
    if (!kind) return copyRefused(t("copyNothing"));
    if (!isAvailable(kind, element.object)) return copyRefused(t("copyUnavailable"));
    var item = {
        kind: kind, x: tile.x, y: tile.y, direction: element.direction, object: element.object,
        quadrant: kind === "small" ? element.quadrant : 0,
        colours: [element.primaryColour, element.secondaryColour, element.tertiaryColour]
    };
    var previousRide = pendingRide();
    state.busy = true;
    refresh();
    clearGhosts(safely(function () {
        // Closing the window meanwhile already reset everything.
        if (state.phase !== "copy") return;
        if (previousRide >= 0) demolishRide(previousRide);
        state.busy = false;
        state.kind = "scenery";
        state.item = item;
        state.mark = null;
        state.offset = 0;
        state.error = null;
        state.phase = "pick";
        state.message = t("copied");
        refresh();
        pickLocation();
    }));
}

function cancelCopy() {
    state.phase = state.copyReturn;
    state.message = "";
    if (isPicking()) pickLocation();
    else cancelOwnTool();
    refresh();
}

// The map step that looks like the arrow on screen with the camera as it is turned now.
function mapStep(aim) {
    var rotation = ui.mainViewport ? ui.mainViewport.rotation : 0;
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(function (d) {
        var v = viewOf(d[0], d[1], 0, rotation);
        return Math.sign(v.x) === aim[0] && Math.sign(v.y) === aim[1];
    })[0];
}

// Moves the mark like a tap next to it would; items on a quarter of a tile move half a tile, so they visit every corner.
function moveMark(aim) {
    if (state.busy) return;
    var d = mapStep(aim);
    if (state.phase === "marked" && isScenery()) {
        var item = state.item, whole = isFullTile(item) || ignoresQuadrant(item), step = whole ? 32 : 16;
        var corner = SCENERY_QUADRANT_POINTS[item.quadrant];
        var p = { x: item.x * 32 + corner[0] + d[0] * step, y: item.y * 32 + corner[1] + d[1] * step };
        markSceneryAt(Math.floor(p.x / 32), Math.floor(p.y / 32), whole ? item.quadrant : quadrantAt(p));
    } else if (state.phase === "marked") {
        markAt(state.mark.x + d[0], state.mark.y + d[1]);
    } else if (state.entrance) {
        var spot = entranceSpotOn(state.entrance.x + d[0], state.entrance.y + d[1], footprint(state.mark));
        if (spot) {
            markEntranceSpot(spot);
        } else {
            state.message = t("mustTouch");
            refresh();
        }
    }
}

function changeHeight(delta) {
    if (state.phase !== "marked" || state.busy) return;
    if (isScenery() && !isHeightAllowed(state.ground, state.offset + delta)) return;
    state.offset += delta;
    updateGhost();
}

function rotateMark() {
    if (state.phase !== "marked" || state.busy) return;
    if (isScenery()) {
        if (!canRotate(state.item)) return;
        state.item.direction = (state.item.direction + 1) % 4;
        state.ground = groundHeight(state.item);
        updateGhost();
        return;
    }
    state.mark.direction = (state.mark.direction + 1) % 4;
    state.base = baseHeight(state.mark);
    updateGhost();
}

function placeRide() {
    var mark = state.mark, z = currentZ();
    state.busy = true;
    refresh();
    clearGhosts(safely(function () {
        expectedPlace = { x: mark.x * 32, y: mark.y * 32 };
        placeTrack(mark, z, 0, safely(function (r) {
            expectedPlace = null;
            state.busy = false;
            if (r.error) {
                ui.showError(t("placeFailed"), errorText(r));
                updateGhost();
                return;
            }
            state.placedZ = z;
            if (!needsEntrances(mark.ride)) {
                context.executeAction("ridesetstatus", { ride: mark.ride, status: 1 });
                state.phase = "done";
                reset(t("placedOpen", money(r.cost)));
                return;
            }
            startEntrance("entrance");
        }));
    }));
}

// The same item stays chosen, so the next tap starts another one at the same height and rotation.
function placeSceneryItem() {
    var item = state.item, z = currentZ();
    state.busy = true;
    refresh();
    clearGhosts(safely(function () {
        placeScenery(item, z, 0, safely(function (r) {
            state.busy = false;
            if (state.item !== item) return;
            if (r.error) {
                ui.showError(t("sceneryFailed"), errorText(r));
                updateGhost();
                return;
            }
            state.item = copyItem(item, {});
            state.phase = "pick";
            state.message = park.getFlag("noMoney") ? t("sceneryPlacedFree") : t("sceneryPlaced", money(r.cost));
            refresh();
        }));
    }));
}

function startEntrance(phase) {
    state.phase = phase;
    state.entrance = null;
    state.message = "";
    refresh();
    pickLocation();
}

function markEntrance(mapCoords) {
    var spot = entranceSpot(mapCoords, footprint(state.mark), state.placedZ, ui.mainViewport.rotation);
    if (!spot) {
        state.message = t("mustTouch");
        refresh();
        return;
    }
    markEntranceSpot(spot);
}

function markEntranceSpot(spot) {
    state.message = "";
    state.busy = true;
    var isExit = state.phase === "exit", ride = state.mark.ride;
    clearGhosts(safely(function () {
        context.executeAction("rideentranceexitplace", entranceArgs(spot, ride, isExit, GHOST_FLAG), safely(function (r) {
            state.busy = false;
            if (r.error) {
                // The previous preview is already gone, so nothing is left marked to place.
                state.entrance = null;
                state.message = errorText(r);
                refresh();
                return;
            }
            state.entrance = spot;
            state.entranceGhost = { x: spot.x, y: spot.y, ride: ride, isExit: isExit };
            refresh();
        }));
    }));
}

function placeEntrance() {
    var spot = state.entrance, isExit = state.phase === "exit", ride = state.mark.ride;
    state.busy = true;
    refresh();
    clearGhosts(safely(function () {
        context.executeAction("rideentranceexitplace", entranceArgs(spot, ride, isExit, 0), safely(function (r) {
            state.busy = false;
            if (r.error) {
                ui.showError(isExit ? t("exitFailed") : t("entranceFailed"), errorText(r));
                startEntrance(state.phase);
                return;
            }
            if (isExit) {
                reset(t("doneEntrances"));
            } else {
                startEntrance("exit");
            }
        }));
    }));
}

function onPlace() {
    if (state.busy) return;
    if (state.phase === "marked" && isScenery()) placeSceneryItem();
    else if (state.phase === "marked") placeRide();
    else if ((state.phase === "entrance" || state.phase === "exit") && state.entrance) placeEntrance();
}

function onCancel() {
    if (state.busy) return;
    if (state.phase === "copy") return cancelCopy();
    if (state.phase === "entrance") {
        cancelOwnTool();
        clearGhosts();
        startEntrance("exit");
        return;
    }
    reset();
}

function openWindow() {
    var existing = getWindow();
    if (existing) {
        existing.bringToFront();
        refresh();
        return;
    }
    var y = 18, half = (WIDTH - 16) / 2, quarter = Math.floor((WIDTH - 18) / 4);
    ui.openWindow({
        classification: WINDOW_CLASS,
        title: t("title"),
        x: ui.width - WIDTH - 10,
        y: 40,
        width: WIDTH,
        height: y + 228,
        widgets: [
            { type: "label", name: "status", x: 6, y: y, width: WIDTH - 12, height: 12, text: "" },
            { type: "groupbox", x: 4, y: y + 16, width: WIDTH - 8, height: 44, text: t("height") },
            { type: "button", name: "lower", x: 12, y: y + 30, width: 50, height: 24, text: "-", onClick: safely(function () { changeHeight(-1); }) },
            { type: "label", name: "height", x: 66, y: y + 36, width: WIDTH - 132, height: 12, text: "", textAlign: "centred" },
            { type: "button", name: "raise", x: WIDTH - 62, y: y + 30, width: 50, height: 24, text: "+", onClick: safely(function () { changeHeight(1); }) },
            { type: "button", name: "rotate", x: 6, y: y + 66, width: half, height: 24, text: t("rotate"), onClick: safely(rotateMark) },
            { type: "button", name: "copy", x: WIDTH / 2 + 2, y: y + 66, width: half, height: 24, text: t("copy"), onClick: safely(startCopy) },
            { type: "label", name: "cost", x: 8, y: y + 130, width: WIDTH - 16, height: 12, text: "" },
            { type: "button", name: "place", x: 6, y: y + 146, width: half, height: 24, text: t("place"), onClick: safely(onPlace) },
            { type: "button", name: "cancel", x: WIDTH / 2 + 2, y: y + 146, width: half, height: 24, text: t("cancel"), onClick: safely(onCancel) },
            {
                type: "checkbox", name: "enabled", x: 6, y: y + 176, width: WIDTH - 12, height: 14,
                text: t("confirm"), isChecked: enabled(),
                onChange: function (checked) { context.sharedStorage.set(ENABLED_KEY, checked); }
            },
            {
                type: "checkbox", name: "sceneryEnabled", x: 6, y: y + 194, width: WIDTH - 12, height: 14,
                text: t("confirmScenery"), isChecked: sceneryEnabled(),
                onChange: function (checked) { context.sharedStorage.set(SCENERY_ENABLED_KEY, checked); }
            }
        ].concat(ARROWS.map(function (arrow, i) {
            return {
                type: "button", name: arrow.name, x: 6 + i * (quarter + 2), y: y + 96, width: quarter, height: 30,
                image: arrow.image, tooltip: t("move"), onClick: safely(function () { moveMark(arrow.aim); })
            };
        })),
        onClose: safely(function () {
            reset();
        })
    });
    refresh();
}
registerPlugin({
    name: "Colocar atracciones",
    version: "1.3.0",
    authors: ["Ezequiel"],
    type: "local",
    licence: "MIT",
    targetApiVersion: 124,
    main: function () {
        registerRefundAction();
        if (typeof ui === "undefined") return;
        ui.registerMenuItem(t("title"), safely(openWindow));
        context.subscribe("action.query", onActionQuery);
        context.subscribe("action.execute", onActionExecute);
        context.subscribe("map.changed", function () {
            state.ghost = state.entranceGhost = state.sceneryGhost = null;
            state.mark = null;
            state.item = null;
            ownRides = {};
            handledRides = {};
            ui.closeWindows(WINDOW_CLASS);
        });
    }
});
})();
