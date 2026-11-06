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
bundle dist/colocar-atracciones.js colocar-atracciones/src/texts.js shared/i18n.js colocar-atracciones/src/core.js colocar-atracciones/src/scenery.js colocar-atracciones/src/ui.js colocar-atracciones/src/main.js
bundle tests/build/test-i18n.js conectar-caminos/src/texts.js shared/i18n.js tests/harness.js tests/test-i18n.js
bundle tests/build/test-colores.js colocar-atracciones/src/texts.js shared/i18n.js colocar-atracciones/src/core.js tests/harness.js tests/test-colores.js
bundle tests/build/test-circuito.js cerrar-circuito/src/track-support.js cerrar-circuito/src/core.js tests/harness.js tests/test-circuito.js
bundle tests/build/test-circuito-quitar.js cerrar-circuito/src/track-support.js cerrar-circuito/src/core.js tests/harness.js tests/circuito-helpers.js tests/test-circuito-quitar.js
bundle dist/cerrar-circuito.js cerrar-circuito/src/texts.js shared/i18n.js cerrar-circuito/src/track-support.js cerrar-circuito/src/core.js cerrar-circuito/src/ui.js cerrar-circuito/src/main.js
bundle tests/build/test-circuito-ui.js tests/harness.js tests/fake-ui.js cerrar-circuito/src/texts.js shared/i18n.js cerrar-circuito/src/track-support.js cerrar-circuito/src/core.js cerrar-circuito/src/ui.js tests/circuito-helpers.js tests/test-circuito-ui.js
bundle tests/build/test-decorados.js tests/harness.js tests/fake-ui.js colocar-atracciones/src/texts.js shared/i18n.js colocar-atracciones/src/core.js colocar-atracciones/src/scenery.js colocar-atracciones/src/ui.js tests/decorados-helpers.js tests/test-decorados.js
bundle tests/build/test-copiar.js tests/harness.js tests/fake-ui.js colocar-atracciones/src/texts.js shared/i18n.js colocar-atracciones/src/core.js colocar-atracciones/src/scenery.js colocar-atracciones/src/ui.js tests/decorados-helpers.js tests/test-copiar.js
bundle dist/mas-decorados.js mas-decorados/src/texts.js shared/i18n.js mas-decorados/src/theme-table.js mas-decorados/src/core.js mas-decorados/src/loose.js mas-decorados/src/ui.js mas-decorados/src/main.js
bundle tests/build/test-mas-decorados.js tests/harness.js tests/fake-ui.js mas-decorados/src/texts.js shared/i18n.js mas-decorados/src/theme-table.js mas-decorados/src/core.js mas-decorados/src/loose.js mas-decorados/src/ui.js tests/test-mas-decorados.js
