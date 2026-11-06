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
