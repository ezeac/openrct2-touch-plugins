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
        addedFailed: "{0} items added, {1} could not be loaded.",
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
        addedFailed: "Se agregaron {0} objetos, {1} no se pudieron cargar.",
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

// Marking a theme as researched changes the game state, so it goes through an action.
function registerResearchAction() {
    context.registerAction(RESEARCH_ACTION, function () {
        return {};
    }, function (e) {
        var index = e.args.object;
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
        research.uninventedItems = research.uninventedItems.filter(function (item) {
            return !isTheme(item);
        });
        return {};
    });
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

/*
 * Themes the park lacks or has only in part: "new" when it is not loaded, "partial" when some of its items are missing,
 * and "unresearched" when everything is there but the game still keeps it for research.
 */
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
            theme.name = group.name;
            theme.missing = missingItems(group, loaded, installedIds).filter(isScenery).length;
            theme.researched = park.research.isObjectResearched("scenery_group", group.index);
            if (theme.missing === 0 && theme.researched) return;
            theme.status = theme.missing > 0 ? "partial" : "unresearched";
        }
        themes.push(theme);
    });
    return themes.sort(function (a, b) {
        return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });
}

// A missing image file still loads, but with blank images: the game has no other way to tell.
function hasBlankImages(object) {
    if (typeof ui === "undefined" || !ui.imageManager) return false;
    var info = ui.imageManager.getImageInfo(object.baseImageId);
    return !info || info.width === 0;
}

// One item of an expansion theme is loaded to check its images; a lone item leaves nothing behind when unloaded.
function expansionDataMissing(identifier) {
    var table = THEME_TABLE[identifier], first = table ? table[1] : null;
    if (!first || loadedIdentifiers()[first]) return false;
    var object = objectManager.load(first);
    if (!object) return false;
    var blank = hasBlankImages(object);
    if (blank) objectManager.unload(first);
    return blank;
}

function markResearched(group, done) {
    if (park.research.isObjectResearched("scenery_group", group.index)) return done();
    context.executeAction(RESEARCH_ACTION, { object: group.index }, function () {
        done();
    });
}

// Loads the theme and whatever it lacks, then makes it available. Passes the number of scenery items added.
function addTheme(theme, done) {
    if (theme.expansion && theme.status === "new" && expansionDataMissing(theme.identifier)) {
        return done({ error: "missingData" });
    }
    var group = identifierSet(objectManager.getAllObjects("scenery_group"))[theme.identifier] || objectManager.load(theme.identifier);
    if (!group) return done({ error: "loadFailed" });
    var installedIds = identifierSet(objectManager.installedObjects);
    var added = 0, failed = 0;
    missingItems(group, loadedIdentifiers(), installedIds).forEach(function (id) {
        var object = objectManager.load(id);
        if (!object) failed++;
        else if (isScenery(id)) added++;
    });
    markResearched(group, function () {
        done({ added: added, failed: failed });
    });
}
var WINDOW_CLASS = "mas-decorados";
var SCENERY_WINDOW_CLASS = 18;
var WIDTH = 360;
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
    var theme = selectedTheme();
    if (!theme || state.busy) return;
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
                columns: [{ header: t("theme"), ratioWidth: 3 }, { header: t("status"), ratioWidth: 2 }],
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
