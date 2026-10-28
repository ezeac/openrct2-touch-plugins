#!/bin/bash
# Uso: tests/phone-debug.sh "[[41,44,96],[51,49,96]]" "[[46,46],[55,52]]" — instala el plugin auxiliar en el celular.
cd "$(dirname "$0")/.."
sed -e "s/__TARGETS__/$1/" -e "s/__CENTERS__/$2/" -e "s/__SCALE__/1.4375/" tests/phone-debug.js > tests/build/zz-debug.js
adb push tests/build/zz-debug.js /sdcard/openrct2-user/plugin/zz-debug.js >/dev/null && echo instalado
