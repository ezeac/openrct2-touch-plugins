(function () {
"use strict";
var TEXTS = {
    en: {
        title: "Close circuit",
        internalError: "Close circuit: internal error",
        idle: "Tap \"Pick ride\" or open its construction.",
        picking: "Tap a piece of the ride's track.",
        planning: "Looking for a route...",
        preview: "Move the camera to check the route.",
        closed: "This circuit is already closed.",
        noTrack: "This ride has no track yet.",
        notClosedStatus: "Close the ride before changing its track.",
        noRoute: "No route found to close it.",
        needsRemoval: "Needs to remove an end piece: {0} lost if cancelled.",
        pieces: "Pieces: {BLACK}{0}",
        piecesRemoved: "Pieces: {BLACK}{0} (removes {1} at the ends)",
        piecesNone: "Pieces: {BLACK}-",
        cost: "Cost: {BLACK}{0}",
        costNone: "Cost: {BLACK}-",
        undo: "Undo last ({0})",
        buildFailed: "The track could not be built",
        built: "Done: circuit closed for {0}.",
        undone: "Undone. {0} refunded.",
        pick: "Pick ride",
        removeEnds: "Remove end pieces",
        build: "Build",
        cancel: "Cancel"
    },
    es: {
        title: "Cerrar circuito",
        internalError: "Cerrar circuito: error interno",
        idle: "Tocá \"Elegir atracción\" o abrí su construcción.",
        picking: "Tocá una pieza de la vía de la atracción.",
        planning: "Buscando el recorrido...",
        preview: "Mové la cámara para revisar el recorrido.",
        closed: "Este circuito ya está cerrado.",
        noTrack: "Esta atracción todavía no tiene vía.",
        notClosedStatus: "Cerrá la atracción antes de cambiar su vía.",
        noRoute: "No encontré un recorrido para cerrarlo.",
        needsRemoval: "Hay que quitar un extremo: si cancelás, perdés {0}.",
        pieces: "Piezas: {BLACK}{0}",
        piecesRemoved: "Piezas: {BLACK}{0} (quita {1} de los extremos)",
        piecesNone: "Piezas: {BLACK}-",
        cost: "Costo: {BLACK}{0}",
        costNone: "Costo: {BLACK}-",
        undo: "Deshacer último ({0})",
        buildFailed: "No se pudo construir la vía",
        built: "Listo: circuito cerrado por {0}.",
        undone: "Deshecho. Se devolvieron {0}.",
        pick: "Elegir atracción",
        removeEnds: "Quitar extremos",
        build: "Construir",
        cancel: "Cancelar"
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
// Generado con tools/track-support.py desde OpenRCT2 0.5.6: no editar a mano.
var TRACK_PAINT_MASKS = [
    "1ffffffff06000000000fffc3ffffe0001cffdfff8000000003fcffffffffff",
    "7ffffffffffe007fff8001fffffffff01800007bfcfffffffffefc6dcffcfff800003ff03ffffffffffff",
    "10000000000000003ffe1e000003c08000000000003ccfc0003ffff",
    "1fe7ffffffffffe007fff8001fffffffff01800007bfcfffffffffefc6dcffdf80000003fff3ffffffffffff",
    "600000000000000000000000000000100000000000fffffffffe0000400187f800003c003fcffffffffff",
    "25961e0000000000000000000000cc00003965f",
    "21e00000000000000000000c0cc00003000f",
    "3c00c0c000000ffff",
    "600000000000000000000000000000100000000000000025961e000003c080000000000000cc00003965f",
    "2000000000000002000000000000000c0c000000ffff",
    "c0000000000000000",
    "10000000000000000000000000400087f80000000003cc3ffff965f",
    "600000000000007fff8001fffffffff01800007bfcfffffffffefc6dcffdfff800003fff3ffffffffffff",
    "cc00003ffff",
    "600000000000000000000000000000100000000000fffc3ffffe006c400087f8000000003fcffffffffff",
    "c00000000965f",
    "1fe7fffffffffff007fff8001fffffffff0180069fbfcfffffffffefc6dcffdfff800003fff3ffffffffffff",
    "1fe00000000000000000000000000000000003ffe1e006c0000000000000000fccfc0003ffff",
    "100000000000000400000000000000000cc00000fe5f",
    "107000000000000000c00000000965f",
    "1400000000000000000000000000000000000000000000000000000000000000000",
    "400000000000000000000000000000000000000000000000000000000000000000",
    "40000000000000000000000000000000000000000000000000000000000000000",
    "3004000000000000000000000000000f",
    "1fe7ffffffffffe007fff8001fffffffff0180009fffcfffffffffffc6dcffdfff800003fff3ffffffffffff",
    "2000000000000000000800000000000c0c000000965f",
    "60000000000000007800001ffffffff00000007bc0fffc3ffffe006fcc01fff8000000003ffffffffffff",
    "3ffe1e0000000080000000000000cc00003ffff",
    "1000000000100000000000000000000000000000800000003c00fcc000000ffff",
    "600000000000000000000600000000100000018000fffc3ffffefc0043fc87f80000000003cc3ffffffff",
    "1fe7fffffffffff61ffff8003fffffffff0180009fffcfffffffffffc6dcffdfff800003fff3ffffffffffff",
    "c0c000000965f",
    "4000000000000000000c00003ffff",
    "2000000000000000000000000000000c0c000000965f",
    "1800000000000000000000000000080000000000000cc00003965f",
    "1e000000000000000000000000000000000000000000000ffff",
    "3e0000000000000000000000000000000000000c00000000965f",
    "1ff7ffffffffffe007fff8001fffffffff01800007ffcfffffffffefcedcffdfff800003ff03ffffffffffff",
    "cc00003000f",
    "600000000000000000000000000000100000000000fffc3ffffefc00403cf800000003ff3ffffffffffff",
    "e00000000000000000000030040018000000000000000300ff000f",
    "100000000000000000000000000000800000003c00fcc000000ffff",
    "20000000000000000000000000000000000000000000000000000000000000000",
    "c0c000000000f",
    "1e00000000000000000000000000000fc000000000000000000000000000ffff",
    "fffc2597fe000043fc07f80000000003cc3ffff965f",
    "7fff8001fffffffff01800007bfcfffffffffefc6dcffdfff800003fff3ffffffffffff",
    "200fffffffffffe007f800001fffffffff018000007fcfffc3ffffefc6dcffdfff8000000003fcffffffffff",
    "3fefffffffffffe007fff8001fffffffff01800007bfcfffffffffefc6dcffcfff800003ff03fcffffffffff",
    "3c0fffc2597fe000003fc87f8000000003fcffffff965f",
    "6000000001fe007fff8001e000000010180000783cfffffffffefc6c43c0fff800003ff03ffffffffffff"
];
var RIDE_TRACK_SUPPORT = {
    0: [0, [1, 2, 6, 8, 9, 11, 12, 13, 15, 16, 17, 22, 23, 24, 25, 26, 27, 28, 29, 41, 42, 46, 68, 87, 88, 89]],
    1: [1, [1, 2, 3, 6, 7, 8, 9, 11, 13, 15, 16, 17, 19, 20, 22, 23, 24, 25, 26, 27, 28, 29, 34, 35, 41, 42, 43, 68, 69, 70, 79, 81, 82, 87, 88, 89]],
    2: [2, [1, 2, 3, 8, 9, 11, 13, 15, 16, 17, 26, 27, 28, 41, 68, 87, 88, 89]],
    3: [3, [1, 2, 3, 6, 7, 8, 9, 11, 12, 13, 15, 16, 17, 18, 19, 20, 24, 25, 26, 27, 28, 29, 31, 34, 35, 41, 42, 42, 43, 44, 47, 68, 69, 70, 79, 80, 81, 82, 85, 86, 87, 88, 89]],
    4: [4, [1, 2, 3, 5, 6, 8, 10, 11, 13, 15, 16, 17, 22, 23, 28, 41, 49, 81, 82, 87]],
    5: [5, [1, 2, 8, 13, 15, 16, 17, 87]],
    6: [5, [1, 2, 8, 13, 15, 16, 17, 87]],
    7: [5, [1, 2, 3, 8, 13, 15, 16, 17, 87]],
    8: [6, [1, 2, 13, 14, 15, 16, 17]],
    9: [7, [1, 2, 3, 4, 8, 9, 10, 14, 15, 68]],
    10: [8, [1, 2, 3, 8, 13, 15, 16, 17, 26, 27, 28, 41, 81, 82, 87]],
    11: [9, [1, 2, 8, 14, 15, 48]],
    12: [10, [21]],
    13: [11, [1, 2, 3, 6, 8, 13, 15, 16, 22, 23, 28, 29, 41]],
    14: [10, [21]],
    15: [12, [1, 2, 3, 6, 7, 8, 9, 11, 12, 13, 15, 16, 17, 22, 23, 24, 25, 26, 27, 28, 29, 35, 41, 42, 43, 49, 68, 81, 82, 87, 88, 89]],
    16: [13, [1, 2, 3, 8, 9, 13, 15, 16, 68]],
    17: [14, [1, 2, 3, 6, 8, 9, 11, 13, 15, 16, 17, 22, 23, 28, 29, 41, 43, 68, 81, 82, 87, 88, 89]],
    18: [15, [1, 2, 8, 14]],
    19: [16, [1, 2, 3, 6, 7, 8, 9, 11, 12, 13, 15, 16, 17, 19, 20, 22, 23, 24, 25, 26, 27, 28, 29, 34, 35, 41, 42, 43, 49, 68, 69, 70, 79, 81, 82, 85, 87, 88, 89]],
    22: [17, [1, 2, 8, 11, 13, 14, 15, 16, 17, 79, 87]],
    23: [18, [1, 2, 8, 9, 13, 15, 29, 36]],
    24: [19, [1, 2, 8, 14, 29, 56, 60, 61]],
    28: [20, []],
    30: [20, []],
    32: [20, []],
    35: [20, []],
    36: [21, []],
    38: [22, []],
    42: [23, [1, 2, 4, 29, 39]],
    43: [10, [21]],
    44: [24, [0, 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 20, 22, 23, 24, 25, 26, 27, 28, 29, 31, 34, 35, 41, 42, 44, 62, 68, 69, 70, 71, 72, 79, 81, 82, 86, 87, 88, 89]],
    45: [20, []],
    48: [21, []],
    50: [25, [1, 2, 8, 14, 15, 28, 48]],
    51: [24, [0, 1, 2, 3, 6, 7, 8, 9, 11, 12, 13, 15, 16, 17, 18, 19, 20, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 33, 34, 35, 41, 42, 43, 44, 47, 49, 68, 69, 70, 71, 72, 79, 81, 82, 85, 86, 87, 88, 89]],
    52: [26, [0, 1, 2, 3, 6, 7, 8, 9, 11, 12, 13, 15, 16, 17, 22, 23, 28, 29, 30, 34, 35, 41, 42, 43, 68, 70, 81, 82, 87, 88, 89]],
    53: [27, [1, 2, 3, 8, 9, 13, 15, 16, 17, 28, 68, 87, 88, 89]],
    54: [28, [1, 2, 3, 4, 8, 9, 10, 11, 14, 15, 28, 41, 68]],
    55: [29, [1, 2, 3, 6, 8, 9, 13, 15, 16, 17, 22, 23, 24, 25, 26, 27, 28, 29, 31, 41, 50, 52, 53, 68, 81, 82, 87, 88, 89]],
    57: [30, [1, 6, 8, 9, 11, 12, 13, 15, 16, 17, 22, 23, 24, 25, 26, 27, 28, 29, 31, 35, 41, 42, 50, 52, 57, 68, 73, 79, 81, 82, 87, 88, 89]],
    59: [31, [1, 2, 3, 8, 14, 15]],
    60: [32, [1, 2, 8, 9, 13, 16, 29]],
    61: [33, [1, 2, 8, 14, 15]],
    62: [16, [1, 2, 3, 6, 7, 8, 9, 11, 12, 13, 15, 16, 17, 22, 23, 24, 25, 26, 27, 28, 29, 35, 41, 42, 43, 50, 57, 63, 68, 79, 81, 82, 85, 87, 88, 89]],
    63: [5, [1, 2, 8, 13, 15, 16, 17, 87]],
    65: [34, [1, 2, 3, 8, 13, 15, 16, 28, 38]],
    66: [35, [1, 2, 3, 4, 8, 9, 37, 65, 68]],
    67: [36, [1, 2, 8, 14, 66]],
    68: [37, [1, 2, 3, 6, 8, 9, 11, 12, 13, 15, 16, 17, 22, 23, 24, 25, 26, 27, 28, 29, 31, 35, 41, 42, 43, 44, 45, 68, 79, 81, 82, 85, 87, 88, 89]],
    69: [10, [21]],
    72: [38, [1, 2, 13, 15, 16]],
    73: [39, [1, 2, 3, 6, 7, 8, 9, 11, 12, 13, 15, 16, 17, 18, 19, 20, 24, 25, 28, 29, 31, 41, 68, 81, 82, 87, 88, 89]],
    74: [4, [1, 2, 3, 6, 8, 9, 11, 13, 15, 16, 17, 22, 23, 28, 29, 41, 49, 68, 81, 82, 87, 88, 89]],
    75: [40, [1, 2, 4, 5, 6, 16, 28, 29, 39, 40]],
    76: [41, [1, 2, 3, 4, 8, 9, 10, 11, 14, 15, 28, 41, 68]],
    77: [42, []],
    78: [43, [1, 2, 14, 15]],
    79: [32, [1, 2, 13, 16]],
    86: [44, [1, 2, 8, 9, 31, 44, 68]],
    87: [0, [1, 2, 3, 6, 8, 9, 11, 12, 13, 15, 16, 17, 22, 23, 24, 25, 26, 27, 28, 29, 41, 42, 68, 87, 88, 89]],
    88: [45, [1, 2, 6, 8, 13, 15, 16, 17, 22, 23, 24, 25, 26, 27, 29, 87]],
    90: [46, [1, 2, 6, 7, 8, 9, 11, 12, 13, 15, 16, 17, 18, 19, 20, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 34, 35, 41, 42, 43, 44, 47, 68, 69, 70, 71, 72, 87, 88, 89]],
    91: [16, [1, 2, 3, 6, 8, 9, 11, 12, 13, 15, 16, 17, 22, 23, 24, 25, 26, 27, 28, 29, 35, 41, 42, 43, 68, 79, 81, 82, 85, 87, 88, 89]],
    92: [24, [0, 1, 2, 3, 6, 8, 9, 11, 12, 13, 15, 16, 17, 22, 23, 24, 25, 26, 27, 28, 29, 31, 35, 41, 42, 43, 44, 68, 79, 81, 82, 85, 87, 88, 89]],
    93: [9, [1, 2, 8, 9, 14, 15, 56, 68]],
    94: [28, [1, 2, 3, 8, 10, 14, 15, 28, 41, 67]],
    95: [4, [1, 2, 3, 5, 6, 8, 9, 10, 11, 13, 15, 16, 17, 22, 23, 28, 41, 49, 68, 81, 82, 87, 88, 89]],
    96: [47, [0, 1, 2, 3, 4, 6, 8, 9, 11, 12, 13, 15, 16, 17, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 33, 35, 41, 42, 43, 44, 47, 68, 71, 72, 79, 81, 82, 83, 87, 88, 89]],
    97: [48, [0, 1, 2, 3, 4, 6, 8, 9, 10, 11, 12, 13, 15, 16, 17, 19, 20, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 34, 35, 41, 42, 44, 47, 68, 69, 70, 71, 72, 79, 81, 82, 83, 86, 87, 88, 89]],
    98: [49, [0, 1, 2, 3, 6, 8, 10, 11, 13, 15, 16, 17, 23, 25, 27, 87]],
    99: [26, [0, 1, 2, 3, 6, 7, 8, 9, 11, 13, 15, 16, 17, 28, 29, 30, 34, 41, 43, 68, 70, 81, 82, 87, 88, 89]],
    100: [50, [1, 2, 3, 6, 7, 8, 9, 11, 13, 15, 16, 17, 19, 20, 26, 27, 28, 29, 34, 41, 43, 68, 69, 70, 79, 81, 82, 87, 88, 89]],
    101: [37, [1, 2, 6, 7, 8, 9, 11, 12, 13, 15, 16, 17, 19, 20, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 33, 34, 35, 41, 42, 43, 44, 47, 49, 68, 69, 70, 71, 72, 79, 80, 81, 82, 84, 85, 86, 87, 88, 89]],
    102: [26, [0, 1, 2, 3, 6, 8, 9, 11, 12, 13, 15, 16, 17, 22, 23, 28, 29, 35, 41, 43, 68, 81, 82, 87, 88, 89]]
};
var GHOST_FLAG = 64;
var DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]];
var SEARCH_SLICE_MS = 25;
var SEARCH_BUDGET_MS = 6000;
var SEARCH_MARGIN = 16;
var STATION_GROUP = 2;
var GENTLE_SLOPES = [0, 2, 6];
var STEEP_SLOPES = [4, 8];
var GENTLE_BANKS = [0, 2, 4];
var DEFAULT_CLEARANCE = 48;
var SLOPE_EXTRA_CLEARANCE = 16;
var STEEP_EXTRA_CLEARANCE = 64;
var CHAIN_LIFT_FLAG = 1;
var INVERTED_FLAG = 2;
var EVER_OPENED_LIFECYCLE = 1 << 12;

function rotate(x, y, direction) {
    switch (direction & 3) {
        case 0: return { x: x, y: y };
        case 1: return { x: y, y: -x };
        case 2: return { x: -x, y: -y };
        default: return { x: -y, y: x };
    }
}

function stateKey(s) {
    return s.x + "," + s.y + "," + s.h + "," + s.dir + "," + s.slope + "," + s.bank;
}

function sameState(a, b) {
    return stateKey(a) === stateKey(b);
}

var DIAGONAL = 4;

/*
 * A connection point between two pieces: where the next piece starts, its height, slope and bank,
 * and its direction, which has the diagonal bit (4) set when it runs at 45 degrees.
 */
function startStateOf(origin, segment) {
    return {
        x: origin.x / 32, y: origin.y / 32, h: origin.z + segment.beginZ,
        dir: origin.direction | (segment.beginDirection & DIAGONAL), slope: segment.beginSlope, bank: segment.beginBank
    };
}

function originOf(state, segment) {
    return { x: state.x * 32, y: state.y * 32, z: state.h - segment.beginZ, direction: state.dir & 3 };
}

function fitsDirection(state, segment) {
    return (segment.beginDirection & DIAGONAL) === (state.dir & DIAGONAL);
}

// Like the game: the next piece starts one tile further only when the piece ends straight, not diagonally.
function endStateOf(state, segment) {
    var turn = state.dir & 3;
    var r = rotate(segment.endX, segment.endY, turn);
    var dir = (((segment.endDirection & 3) + turn) & 3) | (segment.endDirection & DIAGONAL);
    var step = dir & DIAGONAL ? [0, 0] : DIRS[dir];
    return {
        x: state.x + r.x / 32 + step[0],
        y: state.y + r.y / 32 + step[1],
        h: state.h - segment.beginZ + segment.endZ,
        dir: dir, slope: segment.endSlope, bank: segment.endBank
    };
}

function isPlain(slope, bank) {
    return bank === 0 && GENTLE_SLOPES.indexOf(slope) >= 0;
}

function isGentleBanked(slope, bank) {
    return GENTLE_BANKS.indexOf(bank) >= 0 && GENTLE_SLOPES.indexOf(slope) >= 0;
}

function isKnownSlope(slope) {
    return GENTLE_SLOPES.indexOf(slope) >= 0 || STEEP_SLOPES.indexOf(slope) >= 0;
}

function geometryKey(s) {
    return [s.beginDirection, s.beginZ, s.endZ, s.endX, s.endY, s.endDirection, s.beginSlope, s.endSlope, s.beginBank, s.endBank].join(",");
}

var FLAT_GROUP = 0;
var pieceGroups = {};

// The game places any piece on any ride, but only draws those its track style supports.
function supportsPiece(rideType, segment) {
    var support = RIDE_TRACK_SUPPORT[rideType];
    if (!support) return false;
    var mask = TRACK_PAINT_MASKS[support[0]];
    var digit = mask.length - 1 - (segment.type >> 2);
    if (digit < 0 || !((parseInt(mask.charAt(digit), 16) >> (segment.type & 3)) & 1)) return false;
    return segment.trackGroup === FLAT_GROUP || support[1].indexOf(segment.trackGroup) !== -1;
}

/*
 * Flat and gentle pieces without banking, plus pieces that lead from a banked or steep end into them,
 * grouped by shape: rides use different piece types for the same shape.
 */
function simplePieces(rideType) {
    if (pieceGroups[rideType]) return pieceGroups[rideType];
    var groups = {};
    context.getAllTrackSegments().forEach(function (s) {
        if ((s.beginDirection & 3) !== 0 || s.trackGroup === STATION_GROUP || !supportsPiece(rideType, s)) return;
        if (!isKnownSlope(s.beginSlope) || !isKnownSlope(s.endSlope)) return;
        var plainEnd = isPlain(s.beginSlope, s.beginBank) || isPlain(s.endSlope, s.endBank);
        if (!plainEnd && !(isGentleBanked(s.beginSlope, s.beginBank) && isGentleBanked(s.endSlope, s.endBank))) return;
        var key = geometryKey(s);
        if (!groups[key]) groups[key] = { segment: s, types: [] };
        groups[key].types.push(s.type);
    });
    pieceGroups[rideType] = Object.keys(groups).map(function (k) { return groups[k]; });
    return pieceGroups[rideType];
}

function occupiedTiles(state, segment) {
    var origin = originOf(state, segment);
    return segment.elements.map(function (e) {
        var r = rotate(e.x, e.y, state.dir & 3);
        return { x: state.x + r.x / 32, y: state.y + r.y / 32, z: origin.z + e.z };
    });
}

function trackArgs(ride, state, type, flags, placeFlags, segment) {
    var origin = originOf(state, segment || context.getTrackSegment(type));
    return {
        x: origin.x, y: origin.y, z: origin.z, direction: origin.direction, ride: ride.id, trackType: type,
        rideType: ride.type, brakeSpeed: 0, colour: 0, seatRotation: 4, trackPlaceFlags: placeFlags,
        isFromTrackDesign: false, flags: flags
    };
}

function query(action, args) {
    var result = null;
    context.queryAction(action, args, function (r) {
        result = r;
    });
    return result;
}

// Chain lift on climbs keeps the train from rolling back, when the ride allows it.
function placeFlagOptions(segment) {
    return segment.endZ > segment.beginZ && segment.allowsChainLift ? [CHAIN_LIFT_FLAG, 0] : [0];
}

function createFitter(ride) {
    var cache = {}, workingType = {};
    return function (state, group) {
        var key = stateKey(state) + "|" + geometryKey(group.segment);
        if (cache[key] !== undefined) return cache[key];
        var fit = null;
        var gKey = geometryKey(group.segment);
        var types = workingType[gKey] !== undefined ? [workingType[gKey]] : group.types;
        for (var i = 0; i < types.length && !fit; i++) {
            var options = placeFlagOptions(group.segment);
            for (var j = 0; j < options.length && !fit; j++) {
                var r = query("trackplace", trackArgs(ride, state, types[i], 0, options[j], group.segment));
                if (r && !r.error) {
                    fit = { type: types[i], placeFlags: options[j], cost: r.cost || 0 };
                    workingType[gKey] = types[i];
                }
            }
        }
        cache[key] = fit;
        return fit;
    };
}

function Heap() {
    this.items = [];
}

Heap.prototype.push = function (item) {
    var items = this.items;
    items.push(item);
    var i = items.length - 1;
    while (i > 0) {
        var parent = (i - 1) >> 1;
        if (items[parent].f <= items[i].f) break;
        var tmp = items[parent];
        items[parent] = items[i];
        items[i] = tmp;
        i = parent;
    }
};

Heap.prototype.pop = function () {
    var items = this.items, top = items[0], last = items.pop();
    if (items.length > 0) {
        items[0] = last;
        var i = 0;
        for (;;) {
            var l = 2 * i + 1, r = l + 1, m = i;
            if (l < items.length && items[l].f < items[m].f) m = l;
            if (r < items.length && items[r].f < items[m].f) m = r;
            if (m === i) break;
            var tmp = items[m];
            items[m] = items[i];
            items[i] = tmp;
            i = m;
        }
    }
    return top;
};

function heuristic(s, goal) {
    var dx = Math.abs(s.x - goal.x), dy = Math.abs(s.y - goal.y);
    var tiles = Math.max(dx, dy) + 0.41 * Math.min(dx, dy);
    return Math.max(tiles, Math.abs(s.h - goal.h) / 16);
}

function pieceCost(segment) {
    var shaped = segment.endDirection !== segment.beginDirection || segment.beginSlope !== 0 || segment.endSlope !== 0;
    return Math.max(1, segment.length / 32) + (shaped ? 0.3 : 0);
}

// Free height above a flat piece of this ride, read from its station; sloped pieces need more.
function baseClearance(ride) {
    var start = ride.stations.length > 0 ? ride.stations[0].start : null;
    var found = start && trackIndexOnTile(start.x / 32, start.y / 32, ride.id);
    if (!found) return DEFAULT_CLEARANCE;
    var element = map.getTile(found.x / 32, found.y / 32).elements[found.index];
    return element.clearanceZ - element.baseZ;
}

function clearanceOf(segment, base) {
    var slopes = [segment.beginSlope, segment.endSlope];
    if (STEEP_SLOPES.indexOf(slopes[0]) >= 0 || STEEP_SLOPES.indexOf(slopes[1]) >= 0) return base + STEEP_EXTRA_CLEARANCE;
    if (slopes[0] !== 0 || slopes[1] !== 0 || segment.beginZ !== segment.endZ) return base + SLOPE_EXTRA_CLEARANCE;
    return base;
}

function overlapsPath(node, tiles) {
    for (var n = node; n; n = n.parent) {
        if (!n.tiles) continue;
        for (var i = 0; i < n.tiles.length; i++) {
            for (var j = 0; j < tiles.length; j++) {
                var a = n.tiles[i], b = tiles[j];
                if (a.x === b.x && a.y === b.y && a.z < b.top && b.z < a.top) return true;
            }
        }
    }
    return false;
}

/*
 * Pieces from the open front end to the open back end. The search runs in short slices between game ticks,
 * so the game keeps running; it passes null when there is no route within the time budget or it is cancelled.
 */
function findClosingPieces(ride, from, to, done, isCancelled) {
    if (sameState(from, to)) return done([]);
    var fits = createFitter(ride);
    var clearance = baseClearance(ride);
    var groups = simplePieces(ride.type);
    var minX = Math.min(from.x, to.x) - SEARCH_MARGIN, maxX = Math.max(from.x, to.x) + SEARCH_MARGIN;
    var minY = Math.min(from.y, to.y) - SEARCH_MARGIN, maxY = Math.max(from.y, to.y) + SEARCH_MARGIN;
    var open = new Heap(), best = {};
    open.push({ s: from, g: 0, f: heuristic(from, to), parent: null, piece: null, tiles: null });
    best[stateKey(from)] = 0;
    var deadline = Date.now() + SEARCH_BUDGET_MS;
    var slice = function () {
        if (isCancelled && isCancelled()) return done(null);
        var sliceEnd = Date.now() + SEARCH_SLICE_MS;
        while (open.items.length > 0) {
            if (Date.now() > sliceEnd) {
                if (Date.now() > deadline) return done(null);
                context.setTimeout(slice, 0);
                return;
            }
            var node = open.pop();
            if (best[stateKey(node.s)] < node.g) continue;
            if (sameState(node.s, to)) {
                var pieces = [];
                for (var n = node; n.parent; n = n.parent) pieces.push(n.piece);
                return done(pieces.reverse());
            }
            for (var i = 0; i < groups.length; i++) {
                var seg = groups[i].segment;
                if (seg.beginSlope !== node.s.slope || seg.beginBank !== node.s.bank || !fitsDirection(node.s, seg)) continue;
                var next = endStateOf(node.s, seg);
                if (next.x < minX || next.x > maxX || next.y < minY || next.y > maxY) continue;
                var g = node.g + pieceCost(seg);
                var key = stateKey(next);
                if (best[key] !== undefined && best[key] <= g) continue;
                var tiles = occupiedTiles(node.s, seg), top = clearanceOf(seg, clearance);
                for (var t = 0; t < tiles.length; t++) tiles[t].top = tiles[t].z + top;
                if (overlapsPath(node, tiles)) continue;
                var fit = fits(node.s, groups[i]);
                if (!fit) continue;
                best[key] = g;
                open.push({
                    s: next, g: g, f: g + heuristic(next, to), parent: node, tiles: tiles,
                    piece: { state: node.s, type: fit.type, placeFlags: fit.placeFlags, cost: fit.cost }
                });
            }
        }
        done(null);
    };
    slice();
}

function trackElementAt(origin, segment, rideId) {
    var first = segment.elements[0];
    var r = rotate(first.x, first.y, origin.direction & 3);
    var x = (origin.x + r.x) / 32, y = (origin.y + r.y) / 32, z = origin.z + first.z;
    var elements = map.getTile(x, y).elements;
    for (var i = 0; i < elements.length; i++) {
        var e = elements[i];
        if (e.type === "track" && e.ride === rideId && e.trackType === segment.type && e.baseZ === z && !e.isGhost) return e;
    }
    return null;
}

// Everything needed to put a removed piece back exactly as it was.
function pieceRecord(origin, segment, rideId) {
    var e = trackElementAt(origin, segment, rideId);
    return {
        x: origin.x, y: origin.y, z: origin.z, direction: origin.direction, type: segment.type,
        removeZ: origin.z + segment.elements[0].z,
        placeFlags: e ? (e.hasChainLift ? CHAIN_LIFT_FLAG : 0) | (e.isInverted ? INVERTED_FLAG : 0) : 0,
        brakeSpeed: e && e.brakeBoosterSpeed !== null ? e.brakeBoosterSpeed : 0,
        colour: e && e.colourScheme !== null ? e.colourScheme : 0,
        seatRotation: e && e.seatRotation !== null ? e.seatRotation : 4
    };
}

function findAnyTrack(rideId) {
    var ride = map.getRide(rideId);
    var start = ride && ride.stations.length > 0 ? ride.stations[0].start : null;
    var candidates = [];
    if (start) candidates.push({ x: start.x / 32, y: start.y / 32 });
    for (var i = 0; i < candidates.length; i++) {
        var found = trackIndexOnTile(candidates[i].x, candidates[i].y, rideId);
        if (found) return found;
    }
    for (var x = 1; x < map.size.x - 1; x++) {
        for (var y = 1; y < map.size.y - 1; y++) {
            var any = trackIndexOnTile(x, y, rideId);
            if (any) return any;
        }
    }
    return null;
}

function trackIndexOnTile(x, y, rideId) {
    var elements = map.getTile(x, y).elements;
    for (var i = 0; i < elements.length; i++) {
        if (elements[i].type === "track" && elements[i].ride === rideId && !elements[i].isGhost) return { x: x * 32, y: y * 32, index: i };
    }
    return null;
}

// The two open ends of the circuit: the last piece going forward and the first going backward.
function findOpenEnds(rideId) {
    var found = findAnyTrack(rideId);
    if (!found) return { error: "noTrack" };
    var it = map.getTrackIterator({ x: found.x, y: found.y }, found.index);
    if (!it) return { error: "noTrack" };
    var startKey = JSON.stringify(it.position), guard = 0;
    while (it.next()) {
        if (JSON.stringify(it.position) === startKey || ++guard > 5000) return { error: "closed" };
    }
    var front = [];
    var walker = map.getTrackIterator({ x: found.x, y: found.y }, found.index);
    while (walker.next()) { }
    front.push({ origin: walker.position, segment: walker.segment });
    if (walker.previous()) front.push({ origin: walker.position, segment: walker.segment });
    var back = [];
    var backWalker = map.getTrackIterator({ x: found.x, y: found.y }, found.index);
    while (backWalker.previous()) { }
    back.push({ origin: backWalker.position, segment: backWalker.segment });
    if (backWalker.next()) back.push({ origin: backWalker.position, segment: backWalker.segment });
    return { front: front, back: back };
}

function isStation(segment) {
    return segment.trackGroup === STATION_GROUP;
}

// Variants in order: no removal, one piece off the front, off the back, off both.
function closingOptions(ends) {
    var f = ends.front, b = ends.back, options = [];
    var frontState = function (k) {
        return k === 0 ? endStateOf(startStateOf(f[0].origin, f[0].segment), f[0].segment) : startStateOf(f[0].origin, f[0].segment);
    };
    var backState = function (k) {
        return k === 0 ? startStateOf(b[0].origin, b[0].segment) : endStateOf(startStateOf(b[0].origin, b[0].segment), b[0].segment);
    };
    [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(function (c) {
        if (c[0] && (f.length < 2 || isStation(f[0].segment))) return;
        if (c[1] && (b.length < 2 || isStation(b[0].segment))) return;
        options.push({ removeFront: c[0] === 1, removeBack: c[1] === 1, from: frontState(c[0]), to: backState(c[1]) });
    });
    return options;
}

// Game actions run on the next tick, so results only arrive through callbacks.
function executeAll(calls, done) {
    var results = [], pending = calls.length;
    if (pending === 0) {
        done(results);
        return;
    }
    calls.forEach(function (call, index) {
        context.executeAction(call.action, call.args, function (result) {
            results[index] = result;
            if (--pending === 0) done(results);
        });
    });
}

function removeCall(record, flags) {
    return { action: "trackremove", args: { x: record.x, y: record.y, z: record.removeZ, direction: record.direction, trackType: record.type, sequence: 0, flags: flags } };
}

function restoreCall(ride, record) {
    return {
        action: "trackplace", args: {
            x: record.x, y: record.y, z: record.z, direction: record.direction, ride: ride.id, trackType: record.type,
            rideType: ride.type, brakeSpeed: record.brakeSpeed, colour: record.colour, seatRotation: record.seatRotation,
            trackPlaceFlags: record.placeFlags, isFromTrackDesign: false, flags: 0
        }
    };
}

function pieceRecordFromPlan(ride, piece) {
    var segment = context.getTrackSegment(piece.type);
    var origin = originOf(piece.state, segment);
    return {
        x: origin.x, y: origin.y, z: origin.z, direction: origin.direction, type: piece.type,
        removeZ: origin.z + segment.elements[0].z, placeFlags: piece.placeFlags, brakeSpeed: 0, colour: 0, seatRotation: 4
    };
}

function errorOf(results) {
    for (var i = 0; i < results.length; i++) {
        if (results[i].error) return results[i].errorMessage || results[i].errorTitle || "error";
    }
    return null;
}

function costOf(results) {
    var total = 0;
    results.forEach(function (r) { if (!r.error) total += r.cost || 0; });
    return total;
}

function hasBeenOpened(ride) {
    return (ride.lifecycleFlags & EVER_OPENED_LIFECYCLE) !== 0;
}

// A ride that has been opened only refunds 70% of a removed piece, so putting it back costs the rest.
function removalLoss(ride, records) {
    if (!hasBeenOpened(ride)) return 0;
    var refund = 0;
    records.forEach(function (r) {
        var result = query("trackremove", removeCall(r, 0).args);
        if (result && !result.error) refund -= result.cost || 0;
    });
    return Math.round(refund * 3 / 7);
}

/*
 * Removes the end pieces an option needs, searches, and puts them back if there is no route.
 * On a ride that has been opened, removing ends needs allowLoss, because putting them back costs money.
 */
function planClosing(rideId, allowLoss, done, isCancelled) {
    var ends = findOpenEnds(rideId);
    if (ends.error) {
        done({ error: ends.error });
        return;
    }
    var ride = map.getRide(rideId);
    var options = closingOptions(ends);
    var tryOption = function (index) {
        if (index >= options.length) {
            done({ error: "noRoute" });
            return;
        }
        var option = options[index];
        var removed = [];
        if (option.removeFront) removed.push(pieceRecord(ends.front[0].origin, ends.front[0].segment, rideId));
        if (option.removeBack) removed.push(pieceRecord(ends.back[0].origin, ends.back[0].segment, rideId));
        if (removed.length > 0 && !allowLoss && hasBeenOpened(ride)) {
            var bothEnds = [pieceRecord(ends.front[0].origin, ends.front[0].segment, rideId), pieceRecord(ends.back[0].origin, ends.back[0].segment, rideId)];
            done({ error: "needsRemoval", loss: removalLoss(ride, bothEnds) });
            return;
        }
        executeAll(removed.map(function (r) { return removeCall(r, 0); }), function (removeResults) {
            if (errorOf(removeResults)) {
                restore(ride, removed.filter(function (r, i) { return !removeResults[i].error; }), function () {
                    tryOption(index + 1);
                });
                return;
            }
            findClosingPieces(ride, option.from, option.to, function (pieces) {
                if (!pieces) {
                    restore(ride, removed, function () {
                        if (isCancelled && isCancelled()) done({ error: "cancelled" });
                        else tryOption(index + 1);
                    });
                    return;
                }
                var cost = 0;
                pieces.forEach(function (p) { cost += p.cost; });
                done({ ride: ride, pieces: pieces, removed: removed, cost: cost, refund: -costOf(removeResults) });
            }, isCancelled);
        });
    };
    tryOption(0);
}

function restore(ride, removed, done) {
    executeAll(removed.map(function (r) { return restoreCall(ride, r); }), function () {
        if (done) done();
    });
}

function placementCalls(plan, flags) {
    return plan.pieces.map(function (p) {
        return { action: "trackplace", args: trackArgs(plan.ride, p.state, p.type, flags, p.placeFlags, context.getTrackSegment(p.type)) };
    });
}

function placeGhosts(plan, done) {
    executeAll(placementCalls(plan, GHOST_FLAG), function (results) {
        done(plan.pieces.filter(function (p, i) { return !results[i].error; }).map(function (p) {
            return pieceRecordFromPlan(plan.ride, p);
        }));
    });
}

function removeGhosts(ghosts, done) {
    executeAll(ghosts.map(function (g) { return removeCall(g, GHOST_FLAG); }), function () {
        if (done) done();
    });
}

// Builds the plan for real; on failure everything placed is removed and the removed ends are put back.
function buildClosing(plan, done) {
    executeAll(placementCalls(plan, 0), function (results) {
        var placed = plan.pieces.filter(function (p, i) { return !results[i].error; }).map(function (p) {
            return pieceRecordFromPlan(plan.ride, p);
        });
        var error = errorOf(results);
        if (error) {
            executeAll(placed.map(function (r) { return removeCall(r, 0); }), function () {
                restore(plan.ride, plan.removed, function () {
                    done({ error: error });
                });
            });
            return;
        }
        done({ rideId: plan.ride.id, placed: placed, removed: plan.removed, cost: costOf(results) });
    });
}

function cancelPlan(plan, done) {
    restore(plan.ride, plan.removed, done);
}

function undoClosing(record, done) {
    var ride = map.getRide(record.rideId);
    executeAll(record.placed.map(function (r) { return removeCall(r, 0); }), function (results) {
        restore(ride, record.removed, function () {
            done(-costOf(results));
        });
    });
}

function isCircuitClosed(rideId) {
    return findOpenEnds(rideId).error === "closed";
}
var WINDOW_CLASS = "cerrar-circuito";
var TOOL_ID = "cerrar-circuito-elegir";
var HISTORY_KEY = "historial";
var MAX_HISTORY = 10;
var RIDE_CONSTRUCTION_CLASS = 13;
var RIDE_CLOSED = "closed";
var WIDTH = 240;

var state = {
    phase: "idle",
    busy: false,
    rideId: null,
    plan: null,
    ghosts: [],
    loss: 0,
    cancelled: false,
    message: ""
};

// Plugin errors only reach the console, which is not visible on a phone.
function safely(fn) {
    return function () {
        try {
            return fn.apply(this, arguments);
        } catch (e) {
            state.busy = false;
            ui.showError(t("internalError"), String(e && e.message || e));
            console.log("cerrar-circuito: " + (e && e.stack || e));
        }
    };
}

function money(value) {
    return context.formatString("{CURRENCY2DP}", value);
}

function history() {
    return context.getParkStorage().get(HISTORY_KEY, []);
}

function saveHistory(list) {
    context.getParkStorage().set(HISTORY_KEY, list.slice(-MAX_HISTORY));
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

function refresh() {
    if (!getWindow()) return;
    var previewing = state.phase === "preview";
    var texts = { idle: t("idle"), picking: t("picking"), planning: t("planning"), preview: t("preview"), needsRemoval: t("needsRemoval", money(state.loss)) };
    setWidget("status", { text: state.message || texts[state.phase] || "" });
    var removed = previewing ? state.plan.removed.length : 0;
    setWidget("pieces", {
        text: !previewing ? t("piecesNone") : removed > 0 ? t("piecesRemoved", state.plan.pieces.length, removed) : t("pieces", state.plan.pieces.length)
    });
    setWidget("cost", { text: previewing ? t("cost", money(state.plan.cost)) : t("costNone") });
    setWidget("removeEnds", { isVisible: state.phase === "needsRemoval", isDisabled: state.busy });
    setWidget("build", { isDisabled: !previewing || state.busy });
    setWidget("cancel", { isDisabled: state.phase === "idle" || (state.busy && state.phase !== "planning") });
    var undoCount = history().length;
    setWidget("undo", { text: t("undo", undoCount), isDisabled: state.busy || undoCount === 0 || previewing });
}

function cancelOwnTool() {
    if (ui.tool && ui.tool.id === TOOL_ID) ui.tool.cancel();
}

function rideUnderConstruction() {
    for (var i = 0; i < ui.windows; i++) {
        var w = ui.getWindow(i);
        if (w && w.classification === RIDE_CONSTRUCTION_CLASS) return w.number;
    }
    return null;
}

function closeRideConstruction() {
    for (var i = ui.windows - 1; i >= 0; i--) {
        var w = ui.getWindow(i);
        if (w && w.classification === RIDE_CONSTRUCTION_CLASS) w.close();
    }
}

function reset(message) {
    cancelOwnTool();
    state.phase = "idle";
    state.rideId = null;
    state.plan = null;
    state.message = message || "";
    refresh();
}

// Leaves the map as it was before the preview: ghosts gone and removed ends back in place.
function discardPreview(done) {
    var plan = state.plan, ghosts = state.ghosts;
    state.plan = null;
    state.ghosts = [];
    removeGhosts(ghosts, function () {
        if (plan) cancelPlan(plan, done);
        else if (done) done();
    });
}

function startPicking() {
    state.phase = "picking";
    state.message = "";
    ui.activateTool({
        id: TOOL_ID,
        cursor: "cross_hair",
        filter: ["ride"],
        onDown: safely(function (e) {
            if (!e.mapCoords || e.tileElementIndex === undefined) return;
            var element = map.getTile(Math.floor(e.mapCoords.x / 32), Math.floor(e.mapCoords.y / 32)).elements[e.tileElementIndex];
            if (!element || element.type !== "track") return;
            cancelOwnTool();
            choose(element.ride, false);
        })
    });
    refresh();
}

function choose(rideId, allowLoss) {
    var ride = map.getRide(rideId);
    if (!ride) return reset();
    if (ride.status !== RIDE_CLOSED) return reset(t("notClosedStatus"));
    closeRideConstruction();
    state.rideId = rideId;
    state.phase = "planning";
    state.busy = true;
    state.cancelled = false;
    refresh();
    planClosing(rideId, allowLoss, safely(function (plan) {
        state.busy = false;
        if (plan.error === "cancelled") return reset();
        if (plan.error === "needsRemoval") {
            state.phase = "needsRemoval";
            state.loss = plan.loss;
            state.message = "";
            refresh();
            return;
        }
        if (plan.error) return reset(t(plan.error));
        state.plan = plan;
        state.phase = "preview";
        state.message = "";
        state.busy = true;
        refresh();
        placeGhosts(plan, safely(function (ghosts) {
            state.ghosts = ghosts;
            state.busy = false;
            refresh();
        }));
    }), function () {
        return state.cancelled;
    });
}

function build() {
    if (state.phase !== "preview" || state.busy) return;
    var plan = state.plan;
    state.busy = true;
    refresh();
    var ghosts = state.ghosts;
    state.ghosts = [];
    removeGhosts(ghosts, safely(function () {
        buildClosing(plan, safely(function (record) {
            state.busy = false;
            state.plan = null;
            if (record.error) {
                ui.showError(t("buildFailed"), record.error);
                return reset();
            }
            var list = history();
            list.push(record);
            saveHistory(list);
            reset(t("built", money(record.cost)));
        }));
    }));
}

function cancel() {
    if (state.phase === "planning") {
        state.cancelled = true;
        return;
    }
    if (state.busy) return;
    state.busy = true;
    discardPreview(safely(function () {
        state.busy = false;
        reset();
    }));
}

function undoLast() {
    var list = history();
    if (state.busy || list.length === 0) return;
    var record = list.pop();
    state.busy = true;
    refresh();
    undoClosing(record, safely(function (refund) {
        saveHistory(list);
        state.busy = false;
        reset(t("undone", money(refund)));
    }));
}

function openWindow() {
    var existing = getWindow();
    if (existing) {
        existing.bringToFront();
        return;
    }
    var y = 18, half = (WIDTH - 16) / 2;
    ui.openWindow({
        classification: WINDOW_CLASS,
        title: t("title"),
        x: ui.width - WIDTH - 10,
        y: ui.height - 190,
        width: WIDTH,
        height: y + 146,
        widgets: [
            { type: "label", name: "status", x: 6, y: y, width: WIDTH - 12, height: 12, text: "" },
            { type: "button", name: "pick", x: 6, y: y + 16, width: WIDTH - 12, height: 22, text: t("pick"), onClick: safely(startPicking) },
            { type: "button", name: "removeEnds", x: 6, y: y + 42, width: WIDTH - 12, height: 22, text: t("removeEnds"), isVisible: false, onClick: safely(function () { choose(state.rideId, true); }) },
            { type: "label", name: "pieces", x: 8, y: y + 68, width: WIDTH - 16, height: 12, text: "" },
            { type: "label", name: "cost", x: 8, y: y + 82, width: WIDTH - 16, height: 12, text: "" },
            { type: "button", name: "build", x: 6, y: y + 98, width: half, height: 24, text: t("build"), onClick: safely(build) },
            { type: "button", name: "cancel", x: WIDTH / 2 + 2, y: y + 98, width: half, height: 24, text: t("cancel"), onClick: safely(cancel) },
            { type: "button", name: "undo", x: 6, y: y + 126, width: WIDTH - 12, height: 18, text: "", onClick: safely(undoLast) }
        ],
        onClose: safely(function () {
            state.cancelled = true;
            cancelOwnTool();
            if (state.plan || state.ghosts.length > 0) discardPreview();
            state.phase = "idle";
            state.busy = false;
        })
    });
    refresh();
    var current = rideUnderConstruction();
    if (current !== null) {
        choose(current, false);
    } else {
        startPicking();
    }
}
registerPlugin({
    name: "Cerrar circuito",
    version: "1.0.0",
    authors: ["Ezequiel"],
    type: "local",
    licence: "MIT",
    targetApiVersion: 124,
    main: function () {
        if (typeof ui === "undefined") return;
        ui.registerMenuItem(t("title"), safely(openWindow));
        context.subscribe("map.changed", function () {
            state.ghosts = [];
            state.plan = null;
            ui.closeWindows(WINDOW_CLASS);
        });
    }
});
})();
