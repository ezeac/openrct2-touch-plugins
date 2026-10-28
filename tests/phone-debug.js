// Plugin auxiliar sólo para pruebas en el celular: centra la cámara y muestra el píxel físico de cada baldosa objetivo.
var TARGETS = __TARGETS__;
var SCALE = __SCALE__;
function project(tx, ty, z, rot) {
    var x = tx * 32 + 16, y = ty * 32 + 16;
    switch (rot) {
        case 0: return { x: y - x, y: (x + y) / 2 - z };
        case 1: return { x: -x - y, y: (y - x) / 2 - z };
        case 2: return { x: x - y, y: (-x - y) / 2 - z };
        default: return { x: x + y, y: (x - y) / 2 - z };
    }
}
function report() {
    var v = ui.mainViewport, f = Math.pow(2, v.zoom), lines = [];
    TARGETS.forEach(function (t) {
        var p = project(t[0], t[1], t[2], v.rotation);
        lines.push(t[0] + "," + t[1] + " => " + Math.round((p.x - v.left) / f * SCALE) + "," + Math.round((p.y - v.top) / f * SCALE));
    });
    return lines;
}
registerPlugin({ name: "zz-debug", version: "1", authors: "test", type: "local", licence: "MIT", targetApiVersion: 124, main: function () {
    ui.registerMenuItem("DBG entradas", function () {
        var D = [[-1, 0], [0, 1], [1, 0], [0, -1]], lines = [];
        for (var x = 1; x < map.size.x - 1; x++) for (var y = 1; y < map.size.y - 1; y++) {
            map.getTile(x, y).elements.forEach(function (e) {
                if (e.type !== "entrance" || e.object === 2) return;
                var r = map.getRide(e.ride);
                if (!r || r.name.indexOf("Twist") < 0) return;
                var f = D[(e.direction + 2) % 4], fx = x + f[0], fy = y + f[1], st = "sin camino";
                map.getTile(fx, fy).elements.forEach(function (p) {
                    if (p.type === "footpath" && Math.abs(p.baseZ - e.baseZ) <= 16) st = (p.edges & (1 << e.direction)) ? "CONECTADO" : "suelto(edges=" + p.edges + ")";
                });
                lines.push(r.name + (e.object === 1 ? " salida " : " entrada ") + x + "," + y + ": " + st);
            });
        }
        ui.openWindow({ classification: "zz-entradas", title: "DBG entradas", x: 10, y: 40, width: 300, height: 18 + lines.length * 12,
            widgets: lines.map(function (l, i) { return { type: "label", x: 4, y: 16 + i * 12, width: 292, height: 12, text: l }; }) });
    });
    ui.registerMenuItem("DBG atracciones", function () {
        var lines = map.rides.slice(-5).map(function (r) {
            var st = r.stations[0];
            return r.id + " " + r.name + " " + r.status + (st && st.start ? " pieza" : " SIN pieza") + (st && st.entrance ? " +entrada" : "") + (st && st.exit ? " +salida" : "");
        });
        lines.unshift("total " + map.numRides);
        ui.openWindow({ classification: "zz-rides", title: "DBG atracciones", x: 10, y: 40, width: 300, height: 18 + lines.length * 12,
            widgets: lines.map(function (l, i) { return { type: "label", x: 4, y: 16 + i * 12, width: 292, height: 12, text: l }; }) });
    });
    var CENTERS = __CENTERS__;
    CENTERS.forEach(function (c, n) { ui.registerMenuItem("DBG ir " + (n + 1), function () {
        ui.mainViewport.moveTo({ x: c[0] * 32, y: c[1] * 32, z: 96 });
        context.setTimeout(function () {
            var lines = report();
            var w = ui.getWindow("zz-debug");
            if (w) w.close();
            ui.openWindow({ classification: "zz-debug", title: "DBG", x: 250, y: 40, width: 180, height: 18 + lines.length * 12,
                widgets: lines.map(function (l, i) { return { type: "label", x: 4, y: 16 + i * 12, width: 172, height: 12, text: l }; }) });
        }, 300);
    }); });
}});
