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
        changes.push([4, template.vehicle.body], [5, template.vehicle.trim], [6, template.vehicle.tertiary]);
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
