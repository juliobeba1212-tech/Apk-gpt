#!/usr/bin/env bash
# Constrói o .mcaddon a partir das fontes do repositório.
# Uso: tools/build.sh
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION="1.0.0"
OUT="dist/Patria_CompoundV_v${VERSION}.mcaddon"

rm -f "$OUT"
zip -r -X "$OUT" Patria_BP Patria_RP \
  -x "*/.*" "*.pyc" "*/__pycache__/*"

echo "✔ Gerado: $OUT"
unzip -l "$OUT"
