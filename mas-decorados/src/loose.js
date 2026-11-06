var LOOSE_LIMITS = { small_scenery: 2047, large_scenery: 2047, wall: 2047, banner: 255, footpath_addition: 255 };
var LOOSE_PREFIX = "loose:";
var GAME_ROW = LOOSE_PREFIX + "game";

// Items that loaded without images in this session: loading them again would only restart research.
var blankLoose = {};

function isStock(identifier) {
    return STOCK_PREFIXES.indexOf(identifier.split(".")[0]) >= 0 && STOCK_LOOSE.indexOf(identifier) < 0;
}

// Installed scenery that no theme brings, grouped by its author so a big pack can be added in parts.
function looseRows(loaded) {
    var inThemes = {};
    objectManager.getAllObjects("scenery_group").forEach(function (group) {
        group.items.forEach(function (id) {
            inThemes[id] = true;
        });
    });
    var rows = {};
    objectManager.installedObjects.forEach(function (o) {
        if (!LOOSE_LIMITS[o.type] || loaded[o.identifier] || inThemes[o.identifier] || blankLoose[o.identifier] || isStock(o.identifier)) return;
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
            failed++;
        } else if (hasBlankImages(object)) {
            objectManager.unload(ids[i]);
            blankLoose[ids[i]] = true;
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
