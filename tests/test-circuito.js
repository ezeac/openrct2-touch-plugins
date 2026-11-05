// Abre un hueco en una montaña rusa de parque1 y comprueba que el plugin lo vuelva a cerrar, y que deshacer lo deje como estaba.
var FLAT_RIDE_GROUP = 59;
function piecesFromStation(rideId) {
    var found = findAnyTrack(rideId);
    var it = map.getTrackIterator({ x: found.x, y: found.y }, found.index);
    var list = [], startKey = JSON.stringify(it.position);
    do {
        list.push({ origin: it.position, segment: it.segment });
    } while (it.next() && JSON.stringify(it.position) !== startKey && list.length < 2000);
    return list;
}

function openGap(rideId, from, count, done) {
    var pieces = piecesFromStation(rideId).slice(from, from + count);
    var records = pieces.map(function (p) { return pieceRecord(p.origin, p.segment, rideId); });
    executeAll(records.map(function (r) { return removeCall(r, 0); }), function (results) {
        done(errorOf(results), pieces.map(function (p) { return p.segment.type; }), records);
    });
}

function trackCount(rideId) {
    var n = 0;
    for (var x = 1; x < map.size.x - 1; x++) for (var y = 1; y < map.size.y - 1; y++) {
        map.getTile(x, y).elements.forEach(function (e) { if (e.type === "track" && e.ride === rideId && !e.isGhost) n++; });
    }
    return n;
}

var CASES = [[14, 3, 3], [14, 12, 5], [14, 30, 8], [15, 5, 3], [15, 17, 3], [15, 22, 4], [15, 30, 4], [15, 44, 5], [15, 50, 6]];

function runCase(i, done) {
    if (i >= CASES.length) return done();
    var rideId = CASES[i][0], from = CASES[i][1], count = CASES[i][2];
    var label = "caso " + i + " (atracción " + rideId + ", desde " + from + ", " + count + " piezas)";
    context.executeAction("ridesetstatus", { ride: rideId, status: 0 }, function () {
        context.setTimeout(function () {
            check(isCircuitClosed(rideId), label + ": arranca cerrado");
            openGap(rideId, from, count, function (error, types, gap) {
                check(!error, label + ": abrir hueco " + error);
                check(!isCircuitClosed(rideId), label + ": quedó abierto");
                var before = trackCount(rideId), t0 = Date.now();
                planClosing(rideId, true, function (plan) {
                    var ms = Date.now() - t0;
                    if (plan.error) {
                        check(false, label + ": sin plan " + plan.error + " (" + ms + " ms, quitadas " + types.join(",") + ")");
                        return restore(map.getRide(rideId), gap, function () { runCase(i + 1, done); });
                    }
                    var rideType = map.getRide(rideId).type;
                    plan.pieces.forEach(function (p) { check(supportsPiece(rideType, context.getTrackSegment(p.type)), label + ": pieza " + p.type + " no se dibuja en el tipo " + rideType); });
                    log(label + ": " + plan.pieces.length + " piezas, quita " + plan.removed.length + ", costo " + plan.cost + ", " + ms + " ms; tipos " + plan.pieces.map(function (p) { return p.type; }).join(",") + " (habían quitado " + types.join(",") + ")");
                    placeGhosts(plan, function (ghosts) {
                        check(ghosts.length === plan.pieces.length, label + ": fantasmas " + ghosts.length);
                        removeGhosts(ghosts, function () {
                            buildClosing(plan, function (record) {
                                check(!record.error, label + ": construir " + record.error);
                                check(isCircuitClosed(rideId), label + ": circuito cerrado");
                                undoClosing(record, function (refund) {
                                    check(trackCount(rideId) === before, label + ": deshacer deja " + trackCount(rideId) + " de " + before);
                                    check(!isCircuitClosed(rideId), label + ": vuelve a estar abierto");
                                    restore(map.getRide(rideId), gap, function () {
                                        check(isCircuitClosed(rideId), label + ": se repuso el hueco");
                                        runCase(i + 1, done);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        }, 1500);
    });
}

// Without a fixed list, gaps are opened at several points of every closed circuit with enough pieces.
function autoCases() {
    var cases = [];
    map.rides.forEach(function (r) {
        if (r.classification !== "ride" || !findAnyTrack(r.id) || !isCircuitClosed(r.id)) return;
        var n = piecesFromStation(r.id).length;
        if (n < 20) return;
        log("atracción " + r.id + " " + r.name + ": " + n + " piezas");
        var step = Number(context.sharedStorage.get("test.step", 0)) || 0;
        if (step > 0) {
            for (var k = 1; k < n - 6; k += step) cases.push([r.id, k, 3 + (k % 4)]);
        } else {
            [0.2, 0.45, 0.7, 0.9].forEach(function (f, j) { cases.push([r.id, Math.floor(n * f), 3 + j]); });
        }
    });
    return cases;
}

runTests("test-circuito", function (done) {
    if (context.configuration.get("general.language") !== null && map.rides.length > 25) CASES = autoCases();
    var unsupported = {};
    for (var x = 1; x < map.size.x - 1; x++) for (var y = 1; y < map.size.y - 1; y++) {
        map.getTile(x, y).elements.forEach(function (e) {
            var ride = e.type === "track" && map.getRide(e.ride);
            var segment = ride && context.getTrackSegment(e.trackType);
            if (segment && segment.trackGroup !== FLAT_RIDE_GROUP && !supportsPiece(ride.type, segment)) unsupported[ride.type + "/" + e.trackType] = 1;
        });
    }
    check(Object.keys(unsupported).length === 0, "piezas reales fuera de la tabla: " + Object.keys(unsupported).join(" "));
    [14, 15].forEach(function (id) { if (map.getRide(id)) log("atracción " + id + " " + map.getRide(id).name); });
    runCase(0, done);
});
