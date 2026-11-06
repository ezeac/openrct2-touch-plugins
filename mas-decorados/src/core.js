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
    var byName = function (key) {
        return function (a, b) {
            var ka = sortKey(key(a)), kb = sortKey(key(b));
            return ka < kb ? -1 : ka > kb ? 1 : 0;
        };
    };
    return themes.sort(byName(function (th) {
        return th.name;
    })).concat(looseRows(loaded).sort(byName(function (row) {
        return row.identifier === GAME_ROW ? "" : " " + row.author;
    })));
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
