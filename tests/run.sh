#!/bin/bash
# Uso: tests/run.sh <harness.js> [parque.park] — corre el juego sin interfaz con el harness y muestra los resultados.
cd "$(dirname "$0")/.." && { [ -n "$NOBUILD" ] || ./build.sh; }
T=$HOME/openrct2-test
rm -f $T/user/plugin/*.js
cp "$1" $T/user/plugin/
PARK=${2:-$T/user/save/parque1.park}
stdbuf -oL -eL timeout ${TIMEOUT:-60} $T/squashfs-root/usr/bin/openrct2-cli "$PARK" --headless --user-data-path=$T/user > $T/run.log 2>&1 &
PID=$!
for i in $(seq 1 ${TIMEOUT:-60}); do sleep 1; grep -q "TEST DONE" $T/run.log && break; done
kill $PID 2>/dev/null; wait $PID 2>/dev/null
sed -e 's/\x1b\[[0-9;]*m//g' $T/run.log | grep -E "TEST|Error|error" | sed "s/^'//; s/'$//"
