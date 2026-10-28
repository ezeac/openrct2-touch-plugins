#!/bin/bash
# Arma cada plugin en un solo archivo dentro de dist/ y los harness de prueba en tests/build/.
set -e
cd "$(dirname "$0")"
mkdir -p dist tests/build
bundle() {
    local out="$1"; shift
    { echo "(function () {"; echo '"use strict";'; cat "$@"; echo "})();"; } > "$out"
}
bundle dist/conectar-caminos.js conectar-caminos/src/texts.js shared/i18n.js conectar-caminos/src/core.js conectar-caminos/src/ui.js conectar-caminos/src/main.js
bundle tests/build/test-conectar.js conectar-caminos/src/core.js tests/harness.js tests/test-conectar.js
bundle tests/build/test-alargar.js conectar-caminos/src/core.js tests/harness.js tests/chain-check.js tests/test-alargar.js
bundle dist/colocar-atracciones.js colocar-atracciones/src/texts.js shared/i18n.js colocar-atracciones/src/core.js colocar-atracciones/src/ui.js colocar-atracciones/src/main.js
bundle tests/build/test-i18n.js conectar-caminos/src/texts.js shared/i18n.js tests/harness.js tests/test-i18n.js
bundle tests/build/test-colores.js colocar-atracciones/src/texts.js shared/i18n.js colocar-atracciones/src/core.js tests/harness.js tests/test-colores.js
