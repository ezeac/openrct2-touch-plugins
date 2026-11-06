// Agrega, completa e investiga temas de decorados en parque3 con la ventana simulada.
var W = WINDOW_CLASS;

function themeRow(identifier) {
    for (var i = 0; i < state.themes.length; i++) if (state.themes[i].identifier === identifier) return i;
    return -1;
}

function pickAndRun(identifier, then) {
    var row = themeRow(identifier);
    check(row >= 0, "el tema " + identifier + " está en la lista");
    if (row < 0) return then();
    fakeWindows[W].findWidget("list").onClick(row, 0);
    var label = text(W, "action");
    click(W, "action");
    waitFor(function () { return !state.busy; }, function () { then(label); });
}

function loadedGroup(identifier) {
    return objectManager.getAllObjects("scenery_group").filter(function (g) { return g.identifier === identifier; })[0] || null;
}

function isUninvented(index) {
    return park.research.uninventedItems.some(function (i) { return i.type === "scenery" && i.object === index; });
}

function canPlace(identifier) {
    var o = objectManager.getAllObjects("small_scenery").filter(function (s) { return s.identifier === identifier; })[0];
    if (!o) return false;
    var ok = false;
    context.queryAction("smallsceneryplace", { x: 59 * 32, y: 47 * 32, z: 0, direction: 0, quadrant: 0, object: o.index, primaryColour: 0, secondaryColour: 0, tertiaryColour: 0 }, function (r) { ok = !r.error; });
    return ok;
}

function researchState() {
    var r = park.research;
    return { stage: r.stage, progress: r.progress, item: JSON.stringify(r.expectedItem) };
}

function itemsResearched(group) {
    return group.items.filter(function (id) {
        var o = loadedObject(id);
        return o && typeOf(id) !== COSTUMES && park.research.isObjectResearched(typeOf(id), o.index);
    }).length;
}

runTests("test-mas-decorados", function (done) {
    registerResearchAction();
    var studyBefore = researchState();
    log("investigación al empezar: " + JSON.stringify(studyBefore));
    check(studyBefore.stage === "designing" && studyBefore.item !== "null", "parque3 tiene algo en investigación");
    openWindow();
    var keys = state.themes.filter(function (th) { return !th.loose; }).map(function (th) { return sortKey(th.name); });
    check(keys.every(function (k, i) { return i === 0 || keys[i - 1] <= k; }), "lista ordenada sin importar mayúsculas ni acentos");
    check(THEME_TABLE["rct2dlc.scenery_group.scgpanda"] !== undefined, "la tabla incluye los temas empaquetados en .parkobj");
    log("temas en la lista: " + state.themes.length + " | " + state.themes.slice(0, 4).map(function (th) { return th.name + " = " + statusText(th); }).join(" ; "));
    check(state.themes.length > 0, "lista temas");
    check(text(W, "action") === t("add") && fakeWindows[W].findWidget("action").isDisabled, "sin selección el botón está apagado");

    var classic = loadedGroup("rct2.scenery_group.scgclass");
    check(classic && isUninvented(classic.index), "parque3 tiene la temática romana sin investigar");
    pickAndRun("rct2.scenery_group.scgclass", function (label) {
        check(label === t("complete"), "un tema cargado se completa: " + label);
        check(park.research.isObjectResearched("scenery_group", classic.index) && !isUninvented(classic.index), "queda investigado y fuera de la cola");
        check(themeRow("rct2.scenery_group.scgclass") < 0, "sale de la lista");
        log("mensaje: " + text(W, "message") + " | " + text(W, "detail"));

        pickAndRun("rct2.scenery_group.scgabstr", function (label2) {
            var abstract = loadedGroup("rct2.scenery_group.scgabstr");
            log("mensaje: " + text(W, "message") + " | " + text(W, "detail"));
            check(label2 === t("add") && abstract !== null, "agrega un tema nuevo");
            check(abstract && park.research.isObjectResearched("scenery_group", abstract.index), "el tema nuevo queda investigado");
            check(text(W, "detail") === counted("added", THEME_TABLE["rct2.scenery_group.scgabstr"][0]), "informa la cantidad de la tabla: " + text(W, "detail"));
            check(canPlace("rct2.scenery_small.tge1"), "un decorado del tema nuevo se puede colocar");
            var studyAfter = researchState();
            check(studyAfter.stage === studyBefore.stage && studyAfter.item === studyBefore.item && studyAfter.progress >= studyBefore.progress,
                "cargar objetos no reinicia la investigación: " + JSON.stringify(studyAfter));

            // Tema a medias: el grupo cargado sin sus objetos.
            var west = objectManager.load("rct2.scenery_group.scgwwest");
            reload();
            var row = themeRow("rct2.scenery_group.scgwwest");
            check(row >= 0 && state.themes[row].status === "partial" && state.themes[row].missing === THEME_TABLE["rct2.scenery_group.scgwwest"][0], "detecta el tema a medias con lo que falta: " + (row >= 0 && statusText(state.themes[row])));
            pickAndRun("rct2.scenery_group.scgwwest", function () {
                var missing = missingItems(loadedGroup("rct2.scenery_group.scgwwest"), loadedIdentifiers(), identifierSet(objectManager.installedObjects));
                check(missing.length === 0, "completar carga todo lo que faltaba");
                expansionCase();
            });
        });
    });

    function expansionCase() {
        var theme = state.themes.filter(function (th) { return th.expansion && th.status === "new" && THEME_TABLE[th.identifier]; })[0];
        check(!!theme, "hay un tema de expansión para probar");
        var first = THEME_TABLE[theme.identifier][1], groupsBefore = objectManager.getAllObjects("scenery_group").length;
        var research = JSON.stringify([park.research.inventedItems, park.research.uninventedItems]);
        ui.imageManager = { getImageInfo: function () { return { width: 0, height: 0 }; } };
        pickAndRun(theme.identifier, function () {
            delete ui.imageManager;
            log("expansión sin datos: " + text(W, "message") + " | " + text(W, "detail"));
            check(text(W, "detail") === t("missingData", theme.expansion), "avisa que faltan los datos");
            check(!loadedIdentifiers()[first] && objectManager.getAllObjects("scenery_group").length === groupsBefore, "no deja nada cargado");
            check(JSON.stringify([park.research.inventedItems, park.research.uninventedItems]) === research, "no toca la investigación");
            check(themeRow(theme.identifier) >= 0, "el tema sigue en la lista");
            check(fakeErrors.length === 0, "sin errores en pantalla");
            studyingCase();
        });
    }

    // A theme under research: completing it must make its items available now, not when the research ends.
    function studyingCase() {
        var r = park.research;
        r.priorities = ["scenery"];
        r.funding = 3;
        r.stage = "initial_research";
        r.progress = 65000;
        waitFor(function () { return r.stage === "designing"; }, function () {
            var item = r.expectedItem;
            check(item && item.type === "scenery", "queda un tema en investigación: " + JSON.stringify(item));
            if (!item || item.type !== "scenery") return done();
            var group = objectManager.getObject("scenery_group", item.object);
            log("tema en investigación: " + group.identifier + " con " + itemsResearched(group) + " objetos disponibles");
            pickAndRun(group.identifier, function () {
                log("mensaje: " + text(W, "message") + " | " + text(W, "detail"));
                var available = itemsResearched(group), total = group.items.filter(isScenery).length;
                check(available === total, "sus objetos quedan disponibles: " + available + "/" + total);
                check(r.isObjectResearched("scenery_group", group.index) && themeRow(group.identifier) < 0, "el tema queda investigado y sale de la lista");
                check(r.expectedItem === null || r.expectedItem.object !== group.index || r.expectedItem.type !== "scenery", "la investigación pasa a otra cosa");
                check(fakeErrors.length === 0, "sin errores en pantalla");
                looseCase();
            });
        });
    }

    // Objetos sueltos instalados por tests/objetos-prueba.py: dos autores, uno sin autor, más los del juego.
    function looseCase() {
        reload();
        var rows = state.themes.filter(function (th) { return th.loose; });
        log("filas sueltas: " + rows.map(function (r) { return themeName(r) + " = " + statusText(r); }).join(" ; "));
        var byKey = function (key) { return state.themes.filter(function (th) { return th.identifier === key; })[0]; };
        var a = byKey(LOOSE_PREFIX + "Autor A"), b = byKey(LOOSE_PREFIX + "Autor B"), none = byKey(LOOSE_PREFIX), game = byKey(GAME_ROW);
        check(a && a.count === 3 && b && b.count === 2 && none && none.count === 1, "una fila por autor con su cantidad");
        check(game && game.count === STOCK_LOOSE.length, "fila con los sueltos del juego: " + (game && game.count));
        check(rows[0] === game && state.themes.indexOf(game) > state.themes.filter(function (th) { return !th.loose; }).length - 1, "las filas sueltas van después de los temas, primero la del juego");
        var studyBefore = researchState(), smalls = objectManager.getAllObjects("small_scenery").length;
        // Límite lleno: sólo entra uno de los tres de Autor A.
        LOOSE_LIMITS.small_scenery = smalls + 1;
        pickAndRun(a.identifier, function (label) {
            LOOSE_LIMITS.small_scenery = 2047;
            log("límite: " + text(W, "message") + " | " + text(W, "detail"));
            check(label === t("add") && text(W, "detail") === [t("partAdded", 1), t("partLimit", 2)].join(" "), "carga lo que entra y avisa lo que quedó afuera");
            var left = byKey(a.identifier);
            check(left && left.count === 2, "la fila sigue con lo que falta: " + (left && left.count));
            var arbol = loadedObject("prueba.scenery_small.arbol1") || loadedObject("prueba.scenery_small.arbol2") || loadedObject("prueba.scenery_small.arbol3");
            check(arbol && park.research.isObjectResearched("small_scenery", arbol.index), "el cargado queda disponible");
            check(arbol && canPlace(arbol.identifier), "y se puede colocar");
            var after = researchState();
            check(after.stage === studyBefore.stage && after.item === studyBefore.item && after.progress >= studyBefore.progress, "la investigación sigue igual: " + JSON.stringify(after));
            blankCase(b);
        });
    }

    // Un objeto que carga sin imágenes se descarta y la fila sale de la lista.
    function blankCase(b) {
        var blankId = "prueba.scenery_large.tienda1";
        // Sin interfaz no hay imágenes que mirar, así que se simula cuál vino en blanco.
        var realCheck = hasBlankImages;
        hasBlankImages = function (o) { return o.identifier === blankId; };
        pickAndRun(b.identifier, function () {
            hasBlankImages = realCheck;
            log("sin imágenes: " + text(W, "detail"));
            check(text(W, "detail") === [t("partAdded", 1), t("partBlank", 1)].join(" "), "avisa el que vino sin imágenes");
            check(!loadedObject(blankId) && loadedObject("prueba.scenery_wall.muro1") !== null, "lo descarta y deja el otro");
            check(state.themes.filter(function (th) { return th.identifier === b.identifier; }).length === 0, "la fila sale de la lista");
            check(fakeErrors.length === 0, "sin errores en pantalla");
            done();
        });
    }
});
