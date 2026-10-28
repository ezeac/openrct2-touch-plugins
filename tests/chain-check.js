function chainIsConsistent(chain) {
    for (var i = 0; i < chain.length - 1; i++) {
        var d = directionBetween(chain[i], chain[i + 1]);
        if (d < 0) return "no adyacentes en " + i;
        var out = portTowards(chain[i], d), back = portTowards(chain[i + 1], opposite(d));
        if (!out || !back || out.z !== back.z) return "alturas no coinciden en " + i;
    }
    var seen = {};
    for (var j = 0; j < chain.length; j++) {
        var k = tileKey(chain[j].x, chain[j].y);
        if (seen[k]) return "baldosa repetida " + k;
        seen[k] = true;
    }
    return null;
}
