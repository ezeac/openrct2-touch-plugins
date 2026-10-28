(function () {
"use strict";
var TEXTS = {
    en: {
        title: "Place rides",
        internalError: "Place rides: internal error",
        cantBuild: "Cannot build here",
        idle: "Choose a ride in the game's menu.",
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
        confirm: "Ask for confirmation when placing"
    },
    es: {
        title: "Colocar atracciones",
        internalError: "Colocar atracciones: error interno",
        cantBuild: "No se puede construir acá",
        idle: "Elegí una atracción en el menú del juego.",
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
        confirm: "Pedir confirmación al colocar"
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
var WINDOW_CLASS = "colocar-atracciones";
var TOOL_ID = "colocar-atracciones-lugar";
var ENABLED_KEY = "colocar-atracciones.confirmar";
var RIDE_CONSTRUCTION_CLASS = 13;
var WIDTH = 220;

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
    message: ""
};

// Rides the game created and the plugin already took over, and rides the plugin created itself.
var handledRides = {};
var ownRides = {};
var expectedPlace = null;
var pendingCapture = null;

function enabled() {
    return context.sharedStorage.get(ENABLED_KEY, true);
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
    return state.base + state.offset * HEIGHT_STEP;
}

function refresh() {
    if (!getWindow()) return;
    var marked = state.phase === "marked";
    var placingEntrance = state.phase === "entrance" || state.phase === "exit";
    var texts = {
        idle: t("idle"),
        pick: t("pick"),
        marked: state.error || t("marked"),
        entrance: state.entrance ? t("entranceMarked") : t("entrancePick"),
        exit: state.entrance ? t("exitMarked") : t("exitPick")
    };
    setWidget("status", { text: state.message || texts[state.phase] });
    setWidget("height", { text: marked ? "{BLACK}" + (state.offset >= 0 ? "+" : "") + state.offset : "{BLACK}-" });
    setWidget("cost", { text: marked && state.cost !== null ? t("cost", money(state.cost)) : t("costNone") });
    setWidget("lower", { isDisabled: !marked || state.busy });
    setWidget("raise", { isDisabled: !marked || state.busy });
    setWidget("rotate", { isDisabled: !marked || state.busy });
    var canPlace = (marked && !state.error && state.ghost !== null) || (placingEntrance && state.entrance !== null);
    setWidget("place", { isDisabled: !canPlace || state.busy });
    setWidget("cancel", { isDisabled: state.phase === "idle" || state.busy, text: placingEntrance ? t("skip") : t("cancel") });
    setWidget("enabled", { isChecked: enabled() });
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
    var trackGhost = state.ghost, entranceGhost = state.entranceGhost;
    state.ghost = null;
    state.entranceGhost = null;
    removeTrackGhost(trackGhost, function () {
        removeEntranceGhost(entranceGhost, done);
    });
}

function reset(message) {
    cancelOwnTool();
    clearGhosts();
    if (state.mark && (state.phase === "pick" || state.phase === "marked")) demolishRide(state.mark.ride);
    state.phase = "idle";
    state.mark = null;
    state.entrance = null;
    state.busy = false;
    state.message = message || "";
    refresh();
}

function updateGhost() {
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

// Only a ride just chosen in the game's menu: other plugins (like Scenery Manager) also preview existing rides.
function isNewFlatRide(args, alreadyPlaced) {
    if (!enabled() || args.isFromTrackDesign || ownRides[args.ride] || handledRides[args.ride]) return false;
    if (!isFlatRidePiece(args.trackType) || !isRideConstructionOpen()) return false;
    var ride = map.getRide(args.ride);
    return ride !== null && (alreadyPlaced || ride.stations[0].start === null);
}

// The game previews the ride under the cursor as soon as it is chosen, before any tap places it.
function onActionQuery(e) {
    if (e.action !== "trackplace" || ownQuery || !(e.args.flags & GHOST_FLAG) || !isNewFlatRide(e.args, false)) return;
    capture(e.args, null);
}

// If a tap still got through, the plugin takes back that placement and lets the player adjust it.
function onActionExecute(e) {
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
    var previous = state.mark && (state.phase === "pick" || state.phase === "marked") ? state.mark.ride : -1;
    cancelOwnTool();
    clearGhosts();
    state.phase = "idle";
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
            if (forRide) {
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

function changeHeight(delta) {
    if (state.phase !== "marked" || state.busy) return;
    state.offset += delta;
    updateGhost();
}

function rotateMark() {
    if (state.phase !== "marked" || state.busy) return;
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
    state.message = "";
    state.busy = true;
    var isExit = state.phase === "exit", ride = state.mark.ride;
    clearGhosts(safely(function () {
        context.executeAction("rideentranceexitplace", entranceArgs(spot, ride, isExit, GHOST_FLAG), safely(function (r) {
            state.busy = false;
            if (r.error) {
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
    if (state.phase === "marked") placeRide();
    else if (state.phase === "entrance" || state.phase === "exit") placeEntrance();
}

function onCancel() {
    if (state.busy) return;
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
    var y = 18, half = (WIDTH - 16) / 2;
    ui.openWindow({
        classification: WINDOW_CLASS,
        title: t("title"),
        x: ui.width - WIDTH - 10,
        y: 40,
        width: WIDTH,
        height: y + 176,
        widgets: [
            { type: "label", name: "status", x: 6, y: y, width: WIDTH - 12, height: 12, text: "" },
            { type: "groupbox", x: 4, y: y + 16, width: WIDTH - 8, height: 44, text: t("height") },
            { type: "button", name: "lower", x: 12, y: y + 30, width: 50, height: 24, text: "-", onClick: safely(function () { changeHeight(-1); }) },
            { type: "label", name: "height", x: 66, y: y + 36, width: WIDTH - 132, height: 12, text: "", textAlign: "centred" },
            { type: "button", name: "raise", x: WIDTH - 62, y: y + 30, width: 50, height: 24, text: "+", onClick: safely(function () { changeHeight(1); }) },
            { type: "button", name: "rotate", x: 6, y: y + 66, width: WIDTH - 12, height: 24, text: t("rotate"), onClick: safely(rotateMark) },
            { type: "label", name: "cost", x: 8, y: y + 96, width: WIDTH - 16, height: 12, text: "" },
            { type: "button", name: "place", x: 6, y: y + 112, width: half, height: 24, text: t("place"), onClick: safely(onPlace) },
            { type: "button", name: "cancel", x: WIDTH / 2 + 2, y: y + 112, width: half, height: 24, text: t("cancel"), onClick: safely(onCancel) },
            {
                type: "checkbox", name: "enabled", x: 6, y: y + 142, width: WIDTH - 12, height: 14,
                text: t("confirm"), isChecked: enabled(),
                onChange: function (checked) { context.sharedStorage.set(ENABLED_KEY, checked); }
            }
        ],
        onClose: safely(function () {
            reset();
        })
    });
    refresh();
}
registerPlugin({
    name: "Colocar atracciones",
    version: "1.0.1",
    authors: ["Ezequiel"],
    type: "local",
    licence: "MIT",
    targetApiVersion: 124,
    main: function () {
        if (typeof ui === "undefined") return;
        ui.registerMenuItem(t("title"), safely(openWindow));
        context.subscribe("action.query", onActionQuery);
        context.subscribe("action.execute", onActionExecute);
        context.subscribe("map.changed", function () {
            state.ghost = state.entranceGhost = null;
            ui.closeWindows(WINDOW_CLASS);
        });
    }
});
})();
