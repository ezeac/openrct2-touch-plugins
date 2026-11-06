(function () {
"use strict";
var TEXTS = {
    en: {
        title: "More scenery",
        internalError: "More scenery: internal error",
        intro: "Themes the park lacks or has only in part.",
        none: "The park already has every installed theme.",
        theme: "Theme",
        status: "Status",
        statusNew: "New, {0} items",
        statusNewOne: "New, 1 item",
        statusNewUnknown: "New",
        statusPartial: "{0} missing",
        statusPartialOne: "1 missing",
        statusUnresearched: "Not researched",
        expansion: "{0} ({1})",
        pick: "Tap a theme to add it.",
        add: "Add",
        complete: "Complete",
        added: "{0} items added: reopen the scenery menu.",
        addedOne: "1 item added: reopen the scenery menu.",
        addedFailed: "Added: {0}. Could not be loaded: {1}.",
        completed: "Complete now: reopen the scenery menu.",
        missingData: "Needs the {0} files, which this game lacks.",
        loadFailed: "It could not be loaded."
    },
    es: {
        title: "Más decorados",
        internalError: "Más decorados: error interno",
        intro: "Temas que el parque no tiene o tiene a medias.",
        none: "El parque ya tiene todos los temas instalados.",
        theme: "Tema",
        status: "Estado",
        statusNew: "Nuevo, {0} objetos",
        statusNewOne: "Nuevo, 1 objeto",
        statusNewUnknown: "Nuevo",
        statusPartial: "Faltan {0}",
        statusPartialOne: "Falta 1",
        statusUnresearched: "Sin investigar",
        expansion: "{0} ({1})",
        pick: "Tocá un tema para agregarlo.",
        add: "Agregar",
        complete: "Completar",
        added: "Se agregaron {0} objetos: reabrí el menú de decorados.",
        addedOne: "Se agregó 1 objeto: reabrí el menú de decorados.",
        addedFailed: "Agregados: {0}. No se pudieron cargar: {1}.",
        completed: "Quedó completo: reabrí el menú de decorados.",
        missingData: "Necesita los archivos de {0}, que este juego no tiene.",
        loadFailed: "No se pudo cargar."
    }
};
var translations = null;

// Texts in the game's language, or English when the plugin has no translation for it.
function t(key) {
    if (!translations) {
        var language = String(context.configuration.get("general.language", "en-GB") || "en-GB").split("-")[0];
        translations = TEXTS[language] || TEXTS.en;
    }
    var text = translations[key] !== undefined ? translations[key] : TEXTS.en[key];
    for (var i = 1; i < arguments.length; i++) {
        text = text.replace("{" + (i - 1) + "}", arguments[i]);
    }
    return text;
}
// Generado con tools/theme-table.py desde OpenRCT2 0.5.6: no editar a mano.
// Por tema: cantidad de decorados, sin disfraces de animadores, y el primero, que sirve para ver si están los datos de su expansión.
var THEME_TABLE = {
    "rct2.scenery_group.scgabstr": [16, "rct2.scenery_small.tge1"],
    "rct2.scenery_group.scgcandy": [18, "rct2.scenery_small.jelbab1"],
    "rct2.scenery_group.scgclass": [12, "rct2.scenery_large.scol"],
    "rct2.scenery_group.scgegypt": [12, "rct2.scenery_large.sspx"],
    "rct2.scenery_group.scgfence": [16, "rct2.scenery_wall.wmf"],
    "rct2.scenery_group.scggardn": [22, "rct2.scenery_small.tck"],
    "rct2.scenery_group.scggiant": [10, "rct2.scenery_small.ggrs1"],
    "rct2.scenery_group.scghallo": [17, "rct2.scenery_small.tcd"],
    "rct2.scenery_group.scgindus": [22, "rct2.scenery_small.cog1"],
    "rct2.scenery_group.scgjungl": [23, "rct2.scenery_small.tjt1"],
    "rct2.scenery_group.scgjuras": [12, "rct2.scenery_small.tbn"],
    "rct2.scenery_group.scgmart": [9, "rct2.scenery_large.smb"],
    "rct2.scenery_group.scgmedie": [31, "rct2.scenery_small.tct1"],
    "rct2.scenery_group.scgmine": [28, "rct2.scenery_large.smh1"],
    "rct2.scenery_group.scgorien": [14, "rct2.scenery_large.spg"],
    "rct2.scenery_group.scgpathx": [13, "rct2.footpath_item.lamp1"],
    "rct2.scenery_group.scgpirat": [20, "rct2.scenery_large.prship"],
    "rct2.scenery_group.scgshrub": [37, "rct2.scenery_small.ts0"],
    "rct2.scenery_group.scgsixfl": [7, "rct2.scenery_large.glthent"],
    "rct2.scenery_group.scgsnow": [20, "rct2.scenery_large.sip"],
    "rct2.scenery_group.scgspace": [13, "rct2.scenery_large.ssr"],
    "rct2.scenery_group.scgspook": [13, "rct2.scenery_large.ssk1"],
    "rct2.scenery_group.scgsport": [12, "rct2.scenery_small.ball1"],
    "rct2.scenery_group.scgtrees": [41, "rct2.scenery_small.tic"],
    "rct2.scenery_group.scgurban": [10, "rct2.scenery_large.shs1"],
    "rct2.scenery_group.scgwalls": [75, "rct2.scenery_wall.wbr1a"],
    "rct2.scenery_group.scgwater": [6, "rct2.scenery_wall.wallwf32"],
    "rct2.scenery_group.scgwond": [27, "rct2.scenery_small.twh1"],
    "rct2.scenery_group.scgwwest": [10, "rct2.scenery_small.wag1"],
    "rct2dlc.scenery_group.scgpanda": [3, "rct2dlc.scenery_small.bigpanda"],
    "rct2tt.scenery_group.scg1920s": [48, "rct2tt.scenery_large.perdtk01"],
    "rct2tt.scenery_group.scg1920w": [117, "rct2tt.scenery_small.oldnyk01"],
    "rct2tt.scenery_group.scg1960s": [39, "rct2tt.scenery_small.runway01"],
    "rct2tt.scenery_group.scgfutur": [109, "rct2tt.scenery_large.histfix1"],
    "rct2tt.scenery_group.scgjurra": [77, "rct2tt.scenery_large.4x4gmant"],
    "rct2tt.scenery_group.scgmediv": [92, "rct2tt.scenery_large.tavernxx"],
    "rct2tt.scenery_group.scgmytho": [66, "rct2tt.scenery_large.romnc2x2"],
    "rct2ww.scenery_group.scgafric": [104, "rct2ww.scenery_small.oilpump"],
    "rct2ww.scenery_group.scgartic": [46, "rct2ww.scenery_small.roofig01"],
    "rct2ww.scenery_group.scgasia": [104, "rct2ww.scenery_wall.wbambo01"],
    "rct2ww.scenery_group.scgaustr": [41, "rct2ww.scenery_small.waborg01"],
    "rct2ww.scenery_group.scgeurop": [123, "rct2ww.scenery_large.bigben"],
    "rct2ww.scenery_group.scgnamrc": [113, "rct2ww.scenery_small.campfani"],
    "rct2ww.scenery_group.scgsamer": [94, "rct2ww.scenery_small.wmayan01"]
};
var RESEARCH_ACTION = "masdecorados_research";
var ITEM_TYPES = {
    scenery_small: "small_scenery", scenery_large: "large_scenery", scenery_wall: "wall",
    footpath_banner: "banner", footpath_item: "footpath_addition", peep_animations: "peep_animations"
};
var COSTUMES = "peep_animations";
var EXPANSIONS = { wacky_worlds: "Wacky Worlds", time_twister: "Time Twister" };

var RESEARCH_STAGES = ["initial_research", "designing", "completing_design", "unknown", "finished_all"];

// Marks a theme as researched and puts research back where it was, since loading any object restarts it.
function registerResearchAction() {
    var check = function (e) {
        var args = e.args, valid = typeof args.object === "number"
            && (args.stage === undefined || RESEARCH_STAGES.indexOf(args.stage) >= 0 && typeof args.progress === "number" && args.progress >= 0);
        return valid ? {} : { error: 1, errorMessage: "Invalid arguments" };
    };
    context.registerAction(RESEARCH_ACTION, check, function (e) {
        var result = check(e);
        if (result.error) return result;
        // Before the lists: setting them rebuilds what is available, leaving out the item under research.
        if (e.args.stage !== undefined) {
            park.research.stage = e.args.stage;
            park.research.progress = e.args.progress;
        }
        if (e.args.object >= 0) inventTheme(e.args.object);
        return {};
    });
}

// Each list is set only if it changes, because setting the queue loses the "new ride" flag of its rides until the park is reloaded.
function inventTheme(index) {
    var isTheme = function (item) {
        return item.type === "scenery" && item.object === index;
    };
    var research = park.research;
    // The game puts back in the queue any loaded theme missing from both lists, so it goes to invented first.
    var invented = research.inventedItems;
    if (!invented.some(isTheme)) {
        invented.push({ category: "scenery", type: "scenery", object: index });
        research.inventedItems = invented;
    }
    var uninvented = research.uninventedItems;
    if (uninvented.some(isTheme)) {
        research.uninventedItems = uninvented.filter(function (item) {
            return !isTheme(item);
        });
    }
}

function typeOf(identifier) {
    return ITEM_TYPES[identifier.split(".")[1]];
}

function isScenery(identifier) {
    var type = typeOf(identifier);
    return type !== undefined && type !== COSTUMES;
}

function identifierSet(objects) {
    var set = {};
    objects.forEach(function (o) {
        set[o.identifier] = o;
    });
    return set;
}

function loadedIdentifiers() {
    var set = {};
    for (var key in ITEM_TYPES) {
        objectManager.getAllObjects(ITEM_TYPES[key]).forEach(function (o) {
            set[o.identifier] = true;
        });
    }
    return set;
}

function expansionOf(installed) {
    for (var i = 0; i < installed.sourceGames.length; i++) {
        if (EXPANSIONS[installed.sourceGames[i]]) return EXPANSIONS[installed.sourceGames[i]];
    }
    return null;
}

// Items of a loaded theme that are installed but not in the park yet.
function missingItems(group, loaded, installedIds) {
    return group.items.filter(function (id) {
        return !loaded[id] && installedIds[id] && typeOf(id);
    });
}

function sortKey(name) {
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Themes the park lacks ("new"), has in part ("partial") or has whole but still keeps for research ("unresearched").
function listThemes() {
    var installedList = objectManager.installedObjects;
    var installedIds = identifierSet(installedList);
    var groups = identifierSet(objectManager.getAllObjects("scenery_group"));
    var loaded = loadedIdentifiers();
    var themes = [];
    installedList.forEach(function (o) {
        if (o.type !== "scenery_group") return;
        var group = groups[o.identifier], table = THEME_TABLE[o.identifier];
        var theme = { identifier: o.identifier, name: o.name, expansion: expansionOf(o), count: table ? table[0] : null };
        if (!group) {
            theme.status = "new";
        } else {
            // A theme without scenery never counts as researched for the game, so it would stay in the list for good.
            var scenery = group.items.filter(function (id) {
                return isScenery(id) && (loaded[id] || installedIds[id]);
            });
            if (scenery.length === 0) return;
            theme.name = group.name;
            theme.missing = missingItems(group, loaded, installedIds).filter(isScenery).length;
            theme.researched = park.research.isObjectResearched("scenery_group", group.index);
            if (theme.missing === 0 && theme.researched) return;
            theme.status = theme.missing > 0 ? "partial" : "unresearched";
        }
        themes.push(theme);
    });
    return themes.sort(function (a, b) {
        var ka = sortKey(a.name), kb = sortKey(b.name);
        return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
}

// A missing image file still loads, but with blank images: the game has no other way to tell.
function hasBlankImages(object) {
    if (typeof ui === "undefined" || !ui.imageManager) return false;
    var info = ui.imageManager.getImageInfo(object.baseImageId);
    return !info || info.width === 0;
}

function loadedObject(identifier) {
    return objectManager.getAllObjects(typeOf(identifier)).filter(function (o) {
        return o.identifier === identifier;
    })[0] || null;
}

// An item that comes from the theme's expansion: the first of the table, or the first missing one if the theme is loaded.
function probeItem(theme, group) {
    if (!group) return THEME_TABLE[theme.identifier] ? THEME_TABLE[theme.identifier][1] : null;
    var installed = identifierSet(objectManager.installedObjects);
    return missingItems(group, loadedIdentifiers(), installed).filter(function (id) {
        return isScenery(id) && expansionOf(installed[id]);
    })[0] || null;
}

// Checks the images of one item, loading it alone if needed: a lone item leaves nothing behind when unloaded.
function probeExpansion(theme, group, load) {
    var id = probeItem(theme, group);
    if (!id) return { blank: false };
    var object = loadedObject(id);
    if (object) return { blank: hasBlankImages(object) };
    object = load(id);
    if (!object) return { blank: false };
    if (!hasBlankImages(object)) return { blank: false, kept: id };
    objectManager.unload(id);
    return { blank: true };
}

function isStudying(group) {
    var item = group ? park.research.expectedItem : null;
    return !!item && item.type === "scenery" && item.object === group.index;
}

// Loads the theme and whatever it lacks, then makes it available. Passes the number of scenery items added.
// Loading restarts research, so it is put back as it was, unless the theme itself was under research.
function addTheme(theme, done) {
    var group = identifierSet(objectManager.getAllObjects("scenery_group"))[theme.identifier] || null;
    var studying = isStudying(group), research = park.research;
    var restore = studying ? { stage: "initial_research", progress: 0 } : { stage: research.stage, progress: research.progress };
    var touched = false;
    var load = function (id) {
        touched = true;
        return objectManager.load(id);
    };
    var finish = function (index, result) {
        var args = { object: index >= 0 && !research.isObjectResearched("scenery_group", index) ? index : -1 };
        if (touched || studying) {
            args.stage = restore.stage;
            args.progress = restore.progress;
        }
        if (args.object < 0 && args.stage === undefined) return done(result);
        context.executeAction(RESEARCH_ACTION, args, function () {
            done(result);
        });
    };
    var probe = theme.expansion ? probeExpansion(theme, group, load) : { blank: false };
    if (probe.blank) return finish(-1, { error: "missingData" });
    group = group || load(theme.identifier);
    if (!group) return finish(-1, { error: "loadFailed" });
    var installedIds = identifierSet(objectManager.installedObjects);
    var added = probe.kept && isScenery(probe.kept) ? 1 : 0, failed = 0;
    missingItems(group, loadedIdentifiers(), installedIds).forEach(function (id) {
        var object = load(id);
        if (!object) failed++;
        else if (isScenery(id)) added++;
    });
    finish(group.index, { added: added, failed: failed });
}
var WINDOW_CLASS = "mas-decorados";
var SCENERY_WINDOW_CLASS = 18;
var WIDTH = 460;
var LIST_HEIGHT = 170;

var state = { themes: [], selected: -1, message: "", detail: "", busy: false };

// Plugin errors only reach the console, which is not visible on a phone.
function safely(fn) {
    return function () {
        try {
            return fn.apply(this, arguments);
        } catch (e) {
            state.busy = false;
            ui.showError(t("internalError"), String(e && e.message || e));
            console.log("mas-decorados: " + (e && e.stack || e));
        }
    };
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

function themeName(theme) {
    return theme.expansion ? t("expansion", theme.name, theme.expansion) : theme.name;
}

// Texts with a count, in singular when it is one.
function counted(key, n) {
    return n === 1 ? t(key + "One") : t(key, n);
}

function statusText(theme) {
    if (theme.status === "new") return theme.count ? counted("statusNew", theme.count) : t("statusNewUnknown");
    if (theme.status === "partial") return counted("statusPartial", theme.missing);
    return t("statusUnresearched");
}

function selectedTheme() {
    return state.selected >= 0 ? state.themes[state.selected] || null : null;
}

function refresh() {
    if (!getWindow()) return;
    var theme = selectedTheme();
    setWidget("list", {
        items: state.themes.map(function (th) {
            return [themeName(th), statusText(th)];
        }),
        selectedCell: theme ? { row: state.selected, column: 0 } : null
    });
    setWidget("message", { text: state.message || (state.themes.length === 0 ? t("none") : t("pick")) });
    setWidget("detail", { text: state.detail });
    setWidget("action", {
        text: theme && theme.status !== "new" ? t("complete") : t("add"),
        isDisabled: !theme || state.busy
    });
}

function reload(message, detail) {
    state.themes = listThemes();
    state.selected = -1;
    state.message = message || "";
    state.detail = detail || "";
    refresh();
}

// The scenery menu builds its tabs when it opens, so it is closed to show the new themes next time.
function closeSceneryWindow() {
    for (var i = ui.windows - 1; i >= 0; i--) {
        var w = ui.getWindow(i);
        if (w && w.classification === SCENERY_WINDOW_CLASS) w.close();
    }
}

function resultDetail(theme, result) {
    if (result.error === "missingData") return t("missingData", theme.expansion);
    if (result.error) return t("loadFailed");
    if (result.failed > 0) return t("addedFailed", result.added, result.failed);
    return theme.status === "new" || result.added > 0 ? counted("added", result.added) : t("completed");
}

function onAction() {
    var selected = selectedTheme();
    if (!selected || state.busy) return;
    // The list may be stale if the park changed since it was shown.
    var theme = listThemes().filter(function (th) {
        return th.identifier === selected.identifier;
    })[0];
    if (!theme) return reload(themeName(selected), t("completed"));
    state.busy = true;
    refresh();
    addTheme(theme, safely(function (result) {
        state.busy = false;
        if (!result.error) closeSceneryWindow();
        reload(themeName(theme), resultDetail(theme, result));
    }));
}

function openWindow() {
    var existing = getWindow();
    if (existing) {
        existing.bringToFront();
        reload();
        return;
    }
    // A pending answer could have been lost with the previous window.
    state.busy = false;
    var y = 18;
    ui.openWindow({
        classification: WINDOW_CLASS,
        title: t("title"),
        width: WIDTH,
        height: y + LIST_HEIGHT + 76,
        widgets: [
            { type: "label", name: "intro", x: 6, y: y, width: WIDTH - 12, height: 12, text: t("intro") },
            {
                type: "listview", name: "list", x: 6, y: y + 16, width: WIDTH - 12, height: LIST_HEIGHT,
                scrollbars: "vertical", isStriped: true, showColumnHeaders: true, canSelect: true,
                columns: [{ header: t("theme"), ratioWidth: 2 }, { header: t("status"), ratioWidth: 1 }],
                items: [],
                onClick: safely(function (row) {
                    state.selected = row;
                    state.message = "";
                    state.detail = "";
                    refresh();
                })
            },
            { type: "label", name: "message", x: 6, y: y + LIST_HEIGHT + 20, width: WIDTH - 12, height: 12, text: "" },
            { type: "label", name: "detail", x: 6, y: y + LIST_HEIGHT + 33, width: WIDTH - 12, height: 12, text: "" },
            { type: "button", name: "action", x: 6, y: y + LIST_HEIGHT + 48, width: WIDTH - 12, height: 24, text: t("add"), onClick: safely(onAction) }
        ]
    });
    reload();
}
registerPlugin({
    name: "Más decorados",
    version: "1.0.0",
    authors: ["Ezequiel"],
    type: "local",
    licence: "MIT",
    targetApiVersion: 124,
    main: function () {
        registerResearchAction();
        if (typeof ui === "undefined") return;
        ui.registerMenuItem(t("title"), safely(openWindow));
        context.subscribe("map.changed", function () {
            ui.closeWindows(WINDOW_CLASS);
        });
    }
});
})();
