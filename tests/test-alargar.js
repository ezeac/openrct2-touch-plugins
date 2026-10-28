// Caso de parque3: fila de la Rueda Gigante 3 (suelo) hasta el camino elevado de su salida.
runTests("test-alargar", function () {
    var A = { x: 62, y: 75, z: 96 }, B = { x: 64, y: 74, z: 112 };
    var a = endpointFromElement(A.x, A.y, el(A)), b = endpointFromElement(B.x, B.y, el(B));
    var plan = planRoute(a, b, pathStyleFrom(el(A)));
    check(plan !== null, "hay ruta");
    log("ruta base: " + (plan.chain.length - 2) + " baldosas, pendientes " + plan.chain.filter(function (p) { return p.slope >= 0; }).length);
    var t0 = Date.now();
    for (var extra = 2; extra <= 30; extra += 4) {
        var r = lengthenPlan(plan, extra, 3);
        var problem = chainIsConsistent(r.chain);
        check(problem === null, "extra " + extra + ": " + problem);
        check(r.chain.length - plan.chain.length === r.added, "extra " + extra + ": largo informado");
        check(r.added === extra, "extra " + extra + ": se alargó " + r.added);
        log("extra " + extra + " -> +" + r.added + " (" + (r.chain.length - 2) + " baldosas)");
    }
    log("tiempo total " + (Date.now() - t0) + " ms, desvíos posibles " + plan.detours.length);
});
