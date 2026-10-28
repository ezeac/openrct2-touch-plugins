var results = { pass: 0, fail: 0 };
function log(msg) {
    console.log("TEST " + msg);
}
function check(cond, msg) {
    if (cond) { results.pass++; } else { results.fail++; log("FAIL " + msg); }
}
function runTests(name, fn) {
    registerPlugin({
        name: name, version: "1", authors: "test", type: "local", licence: "MIT", targetApiVersion: 124,
        main: function () {
            context.setTimeout(function () {
                var finish = function () { log("DONE pass=" + results.pass + " fail=" + results.fail); };
                try {
                    if (fn.length > 0) fn(finish); else { fn(); finish(); }
                } catch (e) { results.fail++; log("EXCEPTION " + e + " " + (e.stack || "")); finish(); }
            }, 300);
        }
    });
}
function allFootpaths() {
    var list = [];
    for (var x = 1; x < map.size.x - 1; x++) for (var y = 1; y < map.size.y - 1; y++) {
        var els = map.getTile(x, y).elements;
        for (var i = 0; i < els.length; i++) if (els[i].type === "footpath" && !els[i].isGhost) list.push({ x: x, y: y, z: els[i].baseZ, edges: els[i].edges });
    }
    return list;
}

// Element handles go stale after any action reorganises the tile list, so always look them up again.
function el(p) {
    return findFootpathAt(p.x, p.y, p.z);
}
function isDeadEnd(edges) {
    return edges === 1 || edges === 2 || edges === 4 || edges === 8;
}
