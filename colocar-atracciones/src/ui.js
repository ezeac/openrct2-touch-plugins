var WINDOW_CLASS = "colocar-atracciones";
var TOOL_ID = "colocar-atracciones-lugar";
var ENABLED_KEY = "colocar-atracciones.confirmar";
var SCENERY_ENABLED_KEY = "colocar-atracciones.decorados";
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
        exit: state.entrance ? t("exitMarked") : t("exitPick")
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

function reset(message) {
    cancelOwnTool();
    clearGhosts();
    if (!isScenery() && state.mark && (state.phase === "pick" || state.phase === "marked")) demolishRide(state.mark.ride);
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
    var previousRide = !isScenery() && state.mark && (state.phase === "pick" || state.phase === "marked") ? state.mark.ride : -1;
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
    var previous = state.mark && (state.phase === "pick" || state.phase === "marked") ? state.mark.ride : -1;
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
    if (state.phase === "marked" && isScenery()) placeSceneryItem();
    else if (state.phase === "marked") placeRide();
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
        height: y + 194,
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
            },
            {
                type: "checkbox", name: "sceneryEnabled", x: 6, y: y + 160, width: WIDTH - 12, height: 14,
                text: t("confirmScenery"), isChecked: sceneryEnabled(),
                onChange: function (checked) { context.sharedStorage.set(SCENERY_ENABLED_KEY, checked); }
            }
        ],
        onClose: safely(function () {
            reset();
        })
    });
    refresh();
}
