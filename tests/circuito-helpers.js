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
