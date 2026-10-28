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

function snapshotTile(x, y) {
    var els = map.getTile(x, y).elements, s = [];
    for (var i = 0; i < els.length; i++) {
        s.push(els[i].type + ":" + els[i].baseZ + (els[i].type === "footpath" ? ":" + els[i].edges : ""));
    }
    return s.join("|");
}

function pickPairs(paths, count) {
    var pairs = [], seed = 7;
    function rnd(n) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; }
    var guard = 0;
    while (pairs.length < count && guard++ < 5000) {
        var a = paths[rnd(paths.length)], b = paths[rnd(paths.length)];
        var dist = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        if (dist >= 6 && dist <= 25) pairs.push([a, b]);
    }
    return pairs;
}

runTests("test-conectar", function (done) {
    registerEdgesAction();
    var paths = allFootpaths().filter(function (p) { return isDeadEnd(p.edges); });
    log("caminos sin salida en el parque: " + paths.length + ", caja: " + park.cash);
    var pairs = pickPairs(paths, 12);
    var found = 0;
    for (var i = 0; i < pairs.length; i++) {
        var a = endpointFromElement(pairs[i][0].x, pairs[i][0].y, el(pairs[i][0]));
        var b = endpointFromElement(pairs[i][1].x, pairs[i][1].y, el(pairs[i][1]));
        var style = pathStyleFrom(el(pairs[i][0]));
        var isValid = createValidator(style);
        log("par " + i + " inicio " + a.x + "," + a.y + "," + a.z + " s" + a.slope + " -> " + b.x + "," + b.y + "," + b.z + " s" + b.slope);
        var t0 = Date.now();
        var chain = findShortestChain(a, b, isValid);
        var ms = Date.now() - t0;
        if (!chain) {
            log("par " + i + " (" + a.x + "," + a.y + "," + a.z + ")->(" + b.x + "," + b.y + "," + b.z + ") sin ruta, " + ms + " ms");
            continue;
        }
        found++;
        check(chainIsConsistent(chain) === null, "par " + i + ": " + chainIsConsistent(chain));
        var longer = lengthenChain(chain, 8, 3, isValid);
        check(chainIsConsistent(longer.chain) === null, "par " + i + " alargado: " + chainIsConsistent(longer.chain));
        check(longer.chain.length === chain.length + longer.added, "par " + i + " largo alargado");
        var cost = queryChainCost(longer.chain, style);
        log("par " + i + " (" + a.x + "," + a.y + "," + a.z + ")->(" + b.x + "," + b.y + "," + b.z + ") ruta " + (chain.length - 2)
            + " baldosas, alargada +" + longer.added + ", " + ms + " ms, costo " + cost.cost + (cost.error ? " ERROR " + cost.error : ""));
    }
    check(found > 0, "ninguna ruta encontrada");

    var p1 = { x: 51, y: 49, z: 96 }, p2 = { x: 65, y: 49, z: 160 };
    var slopePlan = planRoute(endpointFromElement(p1.x, p1.y, el(p1)), endpointFromElement(p2.x, p2.y, el(p2)), pathStyleFrom(el(p1)));
    check(slopePlan !== null, "ruta con desnivel");
    var slopePairs = [];
    if (slopePlan) {
        check(chainIsConsistent(slopePlan.chain) === null, "desnivel: " + chainIsConsistent(slopePlan.chain));
        var slopes = slopePlan.chain.filter(function (q, idx) { return idx > 0 && idx < slopePlan.chain.length - 1 && q.slope >= 0; }).length;
        log("desnivel: " + (slopePlan.chain.length - 2) + " baldosas, " + slopes + " en pendiente");
        slopePairs.push([p1, p2]);
    }
    buildAndUndo(slopePairs.concat(pairs), 0, done);
});

function buildAndUndo(pairs, j, done) {
    for (; j < pairs.length; j++) {
        var pa = pairs[j][0], pb = pairs[j][1];
        var ea = endpointFromElement(pa.x, pa.y, el(pa)), eb = endpointFromElement(pb.x, pb.y, el(pb));
        var st = pathStyleFrom(el(pa));
        var plan = planRoute(ea, eb, st);
        if (plan) { var c = plan.chain, v = plan.isValid; break; }
    }
    if (j >= pairs.length) { check(false, "sin par para construir"); done(); return; }
    c = lengthenChain(c, 4, 2, v).chain;
    log("par a construir " + j + ": quita decoración en " + sceneryRemovedBy(c) + " baldosas");
    var before = {};
    for (var k = 0; k < c.length; k++) before[tileKey(c[k].x, c[k].y)] = snapshotTile(c[k].x, c[k].y);
    var sameAsBefore = function (label) {
        var same = true;
        for (var k = 0; k < c.length; k++) {
            var now = snapshotTile(c[k].x, c[k].y);
            if (now !== before[tileKey(c[k].x, c[k].y)]) {
                same = false;
                log(label + ": distinto en " + c[k].x + "," + c[k].y + ": antes " + before[tileKey(c[k].x, c[k].y)] + " ahora " + now);
            }
        }
        return same;
    };
    var cashBefore = park.cash;
    placeGhosts(c, st, function (ghosts) {
        check(ghosts.length === c.length - 2, "fantasmas colocados " + ghosts.length + " de " + (c.length - 2));
        var ghostEl = map.getTile(c[1].x, c[1].y).elements.filter(function (e) { return e.type === "footpath" && e.isGhost; });
        check(ghostEl.length === 1, "hay un fantasma en la primera baldosa");
        check(park.cash === cashBefore, "los fantasmas no cobran");
        removeGhosts(ghosts, function () {
            check(sameAsBefore("fantasmas"), "los fantasmas se borraron del todo");
            buildChain(c, st, function (record) {
                check(!record.error, "construir: " + record.error);
                if (record.error) { done(); return; }
                check(record.tiles.length === c.length - 2, "baldosas construidas");
                var first = findFootpathAt(c[1].x, c[1].y, c[1].z);
                check(first && first.edges === edgesFor(c, 1), "bordes de la primera baldosa");
                var endA = findFootpathAt(ea.x, ea.y, ea.z);
                check(endA && (endA.edges & (1 << directionBetween(c[0], c[1]))), "extremo A conectado");
                var endB = findFootpathAt(eb.x, eb.y, eb.z);
                check(endB && (endB.edges & (1 << directionBetween(c[c.length - 1], c[c.length - 2]))), "extremo B conectado");
                log("construido par " + j + ": " + record.tiles.length + " baldosas, costo " + record.cost + ", gastado " + (cashBefore - park.cash));
                undoBuild(record, function (refund) {
                    check(sameAsBefore("deshacer"), "deshacer deja el mapa como antes");
                    log("deshecho: reintegro " + refund + ", caja " + park.cash + " (antes " + cashBefore + ")");
                    done();
                });
            });
        });
    });
}
