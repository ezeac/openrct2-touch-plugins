var WINDOW_CLASS = "colocar-atracciones";
var TOOL_ID = "colocar-atracciones-lugar";
var ENABLED_KEY = "colocar-atracciones.confirmar";
var SCENERY_ENABLED_KEY = "colocar-atracciones.decorados";
var RIDE_CONSTRUCTION_CLASS = 13;
var WIDTH = 220;
var ALIGN_WINDOW_CLASS = "colocar-atracciones-alinear";
var PICKING_PHASES = ["copy", "align"];
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
    fixedZ: null,
    alignRef: null,
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

// With a reference the height stays where it was set; otherwise it follows the ground under the item.
function currentZ() {
    if (isScenery() && state.fixedZ !== null) return state.fixedZ + state.offset * SCENERY_STEP;
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
        copy: t("copyPick"),
        align: state.alignRef ? t("alignChoose") : t("alignPick")
    };
    setWidget("status", { text: state.message || texts[state.phase] });
    setWidget("height", { text: marked ? "{BLACK}" + (state.offset >= 0 ? "+" : "") + state.offset : "{BLACK}-" });
    setWidget("cost", { text: marked && state.cost !== null ? t("cost", money(state.cost)) : t("costNone") });
    var scenery = isScenery() && state.item;
    var limited = function (delta) {
        return scenery && !sceneryHeightAllowed(state.offset + delta);
    };
    setWidget("lower", { isDisabled: !marked || state.busy || limited(-1) });
    setWidget("raise", { isDisabled: !marked || state.busy || limited(1) });
    setWidget("rotate", { isDisabled: !marked || state.busy || (scenery && !canRotate(state.item)) });
    var movable = (marked || (placingEntrance && state.entrance !== null)) && !state.busy;
    ARROWS.forEach(function (arrow) {
        setWidget(arrow.name, { isDisabled: !movable });
    });
    setWidget("copy", { isDisabled: state.busy || ["idle", "pick", "marked"].indexOf(state.phase) < 0 });
    setWidget("align", { isDisabled: state.busy || !scenery || ["pick", "marked"].indexOf(state.phase) < 0 });
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

function sceneryHeightAllowed(offset) {
    if (state.fixedZ !== null) return isZAllowed(state.fixedZ + offset * SCENERY_STEP);
    return isHeightAllowed(state.ground, offset);
}

function reset(message) {
    state.fixedZ = null;
    state.alignRef = null;
    closeAlignChoice();
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
    if (!sceneryHeightAllowed(state.offset)) state.offset = 0;
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
        state.fixedZ = null;
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
    state.fixedZ = null;
    state.alignRef = null;
    closeAlignChoice();
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

// The ground is in the filter too, so a tap next to a thin item still says where it was.
function copyTool() {
    ui.activateTool({
        id: TOOL_ID,
        cursor: "picker",
        filter: ["scenery", "large_scenery", "wall", "terrain", "footpath", "water"],
        onDown: safely(function (e) {
            if (state.busy) return;
            if (state.phase === "copy") copyFrom(e);
            else if (state.phase === "align" && !state.alignRef) alignFrom(e);
        }),
        onFinish: function () {
            if (PICKING_PHASES.indexOf(state.phase) < 0) return;
            context.setTimeout(function () {
                if (PICKING_PHASES.indexOf(state.phase) >= 0 && getWindow() && ui.tool === null) copyTool();
            }, 200);
        }
    });
}

// The scenery under the tap, or the one drawn closest to it; a refusal message when there is none to use.
function pickScenery(e) {
    var tile = e.mapCoords && e.tileElementIndex !== undefined ? map.getTile(Math.floor(e.mapCoords.x / 32), Math.floor(e.mapCoords.y / 32)) : null;
    var element = tile ? tile.elements[e.tileElementIndex] : null;
    if (element && element.isGhost) return { refusal: t("copyGhost") };
    if (element && element.type === "wall") return { refusal: t("copyWall") };
    if (!element || (element.type !== "small_scenery" && element.type !== "large_scenery")) {
        var near = nearestScenery(e);
        if (!near) return { refusal: t("copyNothing") };
        tile = near.tile;
        element = near.element;
    }
    return { tile: { x: tile.x, y: tile.y }, element: element, kind: element.type === "small_scenery" ? "small" : "large" };
}

function copyRefused(message) {
    state.message = message;
    refresh();
}

function isAvailable(kind, index) {
    return context.mode === "scenario_editor" || cheats.ignoreResearchStatus || park.research.isObjectResearched(ELEMENT_TYPES[kind], index);
}

function copyFrom(e) {
    var picked = pickScenery(e);
    if (picked.refusal) return copyRefused(picked.refusal);
    var tile = picked.tile, element = picked.element, kind = picked.kind;
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
        state.fixedZ = null;
        state.error = null;
        state.phase = "pick";
        state.message = t("copied");
        refresh();
        pickLocation();
    }));
}

// The next tap chooses a scenery item to line the one being placed up with, next to it or on top of it.
function startAlign() {
    if (state.busy || !isScenery() || !state.item || ["pick", "marked"].indexOf(state.phase) < 0) return;
    state.copyReturn = state.phase;
    state.phase = "align";
    state.alignRef = null;
    state.message = "";
    refresh();
    copyTool();
}

function alignFrom(e) {
    var picked = pickScenery(e);
    if (picked.refusal) return copyRefused(picked.refusal);
    var el = picked.element;
    state.alignRef = {
        x: picked.tile.x, y: picked.tile.y, z: el.baseZ, top: el.clearanceZ, direction: el.direction,
        quadrant: picked.kind === "small" ? el.quadrant : 0
    };
    state.message = "";
    refresh();
    openAlignChoice();
}

function openAlignChoice() {
    if (ui.getWindow(ALIGN_WINDOW_CLASS)) return;
    var main = getWindow(), width = 150;
    ui.openWindow({
        classification: ALIGN_WINDOW_CLASS,
        title: t("alignTitle"),
        x: main ? main.x - width - 4 : 10,
        y: main ? main.y : 40,
        width: width,
        height: 48,
        widgets: [
            { type: "button", name: "side", x: 6, y: 18, width: 67, height: 24, text: t("alignSide"), onClick: safely(function () { applyAlign(false); }) },
            { type: "button", name: "top", x: 77, y: 18, width: 67, height: 24, text: t("alignTop"), onClick: safely(function () { applyAlign(true); }) }
        ],
        onClose: safely(function () {
            if (state.alignRef) cancelCopy();
        })
    });
}

// The game's closeWindows only knows its own window kinds, so a plugin window is closed through itself.
function closeAlignChoice() {
    var choice = ui.getWindow(ALIGN_WINDOW_CLASS);
    if (choice) choice.close();
}

// Next to it: its exact height, turn and corner on the free tile beside it. On top: its tile and corner, where it ends.
function applyAlign(onTop) {
    var ref = state.alignRef;
    if (!ref || state.phase !== "align" || state.busy) return;
    var item = state.item;
    if (canRotate(item)) item.direction = ref.direction;
    state.alignRef = null;
    state.fixedZ = onTop ? ref.top : ref.z;
    state.offset = 0;
    state.phase = state.copyReturn;
    closeAlignChoice();
    pickLocation();
    var spot = { x: ref.x, y: ref.y };
    if (!onTop) {
        var free = ARROWS.map(function (arrow) {
            var d = mapStep(arrow.aim);
            return { x: ref.x + d[0], y: ref.y + d[1] };
        }).filter(function (p) {
            var r = querySceneryPlace(copyItem(item, { x: p.x, y: p.y, quadrant: ref.quadrant }), state.fixedZ);
            return r && !r.error;
        });
        var first = mapStep(ARROWS[3].aim);
        spot = free[0] || { x: ref.x + first[0], y: ref.y + first[1] };
    }
    markSceneryAt(spot.x, spot.y, ref.quadrant);
}

function cancelCopy() {
    state.alignRef = null;
    closeAlignChoice();
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
    if (isScenery() && !sceneryHeightAllowed(state.offset + delta)) return;
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
    if (PICKING_PHASES.indexOf(state.phase) >= 0) return cancelCopy();
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
        height: y + 254,
        widgets: [
            { type: "label", name: "status", x: 6, y: y, width: WIDTH - 12, height: 12, text: "" },
            { type: "groupbox", x: 4, y: y + 16, width: WIDTH - 8, height: 44, text: t("height") },
            { type: "button", name: "lower", x: 12, y: y + 30, width: 50, height: 24, text: "-", onClick: safely(function () { changeHeight(-1); }) },
            { type: "label", name: "height", x: 66, y: y + 36, width: WIDTH - 132, height: 12, text: "", textAlign: "centred" },
            { type: "button", name: "raise", x: WIDTH - 62, y: y + 30, width: 50, height: 24, text: "+", onClick: safely(function () { changeHeight(1); }) },
            { type: "button", name: "rotate", x: 6, y: y + 66, width: half, height: 24, text: t("rotate"), onClick: safely(rotateMark) },
            { type: "button", name: "copy", x: WIDTH / 2 + 2, y: y + 66, width: half, height: 24, text: t("copy"), onClick: safely(startCopy) },
            { type: "button", name: "align", x: 6, y: y + 92, width: WIDTH - 12, height: 22, text: t("align"), onClick: safely(startAlign) },
            { type: "label", name: "cost", x: 8, y: y + 156, width: WIDTH - 16, height: 12, text: "" },
            { type: "button", name: "place", x: 6, y: y + 172, width: half, height: 24, text: t("place"), onClick: safely(onPlace) },
            { type: "button", name: "cancel", x: WIDTH / 2 + 2, y: y + 172, width: half, height: 24, text: t("cancel"), onClick: safely(onCancel) },
            {
                type: "checkbox", name: "enabled", x: 6, y: y + 202, width: WIDTH - 12, height: 14,
                text: t("confirm"), isChecked: enabled(),
                onChange: function (checked) { context.sharedStorage.set(ENABLED_KEY, checked); }
            },
            {
                type: "checkbox", name: "sceneryEnabled", x: 6, y: y + 220, width: WIDTH - 12, height: 14,
                text: t("confirmScenery"), isChecked: sceneryEnabled(),
                onChange: function (checked) { context.sharedStorage.set(SCENERY_ENABLED_KEY, checked); }
            }
        ].concat(ARROWS.map(function (arrow, i) {
            return {
                type: "button", name: arrow.name, x: 6 + i * (quarter + 2), y: y + 122, width: quarter, height: 30,
                image: arrow.image, tooltip: t("move"), onClick: safely(function () { moveMark(arrow.aim); })
            };
        })),
        onClose: safely(function () {
            reset();
        })
    });
    refresh();
}
