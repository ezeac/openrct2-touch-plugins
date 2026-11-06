var LOOSE_LIMITS = { small_scenery: 2047, large_scenery: 2047, wall: 2047, banner: 255, footpath_addition: 255 };
var LOOSE_PREFIX = "loose:";
var GAME_ROW = "loose-game";

// Items that loaded without images or failed in this session: trying them again would only restart research.
var skippedLoose = {};

// Part of the game unless it says it comes from the community, as objects copied in under a game prefix do.
function isStock(o) {
    var prefix = o.identifier.split(".")[0];
    if (STOCK_PREFIXES.indexOf(prefix) < 0 || STOCK_LOOSE.indexOf(o.identifier) >= 0) return false;
    var custom = o.sourceGames.length === 0 || o.sourceGames.every(function (source) {
        return source === "custom";
    });
    return !custom || STOCK_CUSTOM_PREFIXES.indexOf(prefix) >= 0;
}

// What each theme the game does not bring contains, read once per session: the game only tells it for loaded themes.
var themeItems = {};

function unknownThemes() {
    var loaded = identifierSet(objectManager.getAllObjects("scenery_group"));
    return objectManager.installedObjects.filter(function (o) {
        return o.type === "scenery_group" && !THEME_TABLE[o.identifier] && !loaded[o.identifier] && !themeItems[o.identifier];
    });
}

// Loads each theme alone, notes its items and unloads it, then puts research back and drops the unloaded themes from it.
function learnThemes(done) {
    var unknown = unknownThemes();
    if (unknown.length === 0) return done();
    var research = park.research, restore = { stage: research.stage, progress: research.progress };
    unknown.forEach(function (o) {
        var group = objectManager.load(o.identifier);
        themeItems[o.identifier] = group ? itemsOf(group) : [];
        if (group) objectManager.unload(o.identifier);
    });
    context.executeAction(RESEARCH_ACTION, { object: -1, stage: restore.stage, progress: restore.progress, clean: true }, function () {
        done();
    });
}

// Installed scenery that no theme brings, grouped by its author so a big pack can be added in parts.
function looseRows(loaded) {
    var inThemes = {};
    var mark = function (items) {
        items.forEach(function (id) {
            inThemes[id] = true;
        });
    };
    objectManager.getAllObjects("scenery_group").forEach(function (group) {
        mark(itemsOf(group));
    });
    for (var theme in themeItems) mark(themeItems[theme]);
    var rows = {};
    objectManager.installedObjects.forEach(function (o) {
        if (!LOOSE_LIMITS[o.type] || loaded[o.identifier] || inThemes[o.identifier] || skippedLoose[o.identifier] || isStock(o)) return;
        var key = STOCK_LOOSE.indexOf(o.identifier) >= 0 ? GAME_ROW : LOOSE_PREFIX + (o.authors[0] || "");
        if (!rows[key]) rows[key] = { identifier: key, author: o.authors[0] || "", loose: true, status: "new", items: [] };
        rows[key].items.push({ id: o.identifier, type: o.type });
    });
    return Object.keys(rows).map(function (key) {
        rows[key].count = rows[key].items.length;
        return rows[key];
    });
}

function freeSlots() {
    var free = {};
    for (var type in LOOSE_LIMITS) free[type] = LOOSE_LIMITS[type] - objectManager.getAllObjects(type).length;
    return free;
}

// Loads what fits in one go, since every load restarts research, and drops what came without images.
function addLoose(row, done) {
    var research = park.research, restore = { stage: research.stage, progress: research.progress };
    var free = freeSlots(), ids = [], leftOut = 0;
    row.items.forEach(function (item) {
        if (free[item.type] > 0) {
            free[item.type]--;
            ids.push(item.id);
        } else {
            leftOut++;
        }
    });
    var added = 0, failed = 0, blank = 0;
    var objects = ids.length > 0 ? objectManager.load(ids) : [];
    objects.forEach(function (object, i) {
        if (!object) {
            skippedLoose[ids[i]] = true;
            failed++;
        } else if (hasBlankImages(object)) {
            objectManager.unload(ids[i]);
            skippedLoose[ids[i]] = true;
            blank++;
        } else {
            added++;
        }
    });
    var result = { added: added, failed: failed, blank: blank, leftOut: leftOut };
    if (ids.length === 0) return done(result);
    context.executeAction(RESEARCH_ACTION, { object: -1, stage: restore.stage, progress: restore.progress }, function () {
        done(result);
    });
}
