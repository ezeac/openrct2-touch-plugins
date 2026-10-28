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
