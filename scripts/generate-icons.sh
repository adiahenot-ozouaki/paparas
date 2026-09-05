#!/usr/bin/env bash
# Génère les PNG PWA / OG à partir des SVG dans public/
# Prérequis : ImageMagick (`convert`) avec support SVG (librsvg).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUB="$ROOT/public"

if ! command -v convert >/dev/null 2>&1; then
  echo "ImageMagick (convert) est requis." >&2
  exit 1
fi

convert -background none "$PUB/favicon.svg" -resize 180x180 "$PUB/apple-touch-icon.png"
convert -background none "$PUB/favicon.svg" -resize 192x192 "$PUB/icon-192.png"
convert -background none "$PUB/favicon.svg" -resize 512x512 "$PUB/icon-512.png"
convert -background none "$PUB/icon-maskable.svg" -resize 512x512 "$PUB/icon-512-maskable.png"
convert -background none "$PUB/og-image.svg" "$PUB/og-image.png"

echo "OK — PNG générés dans public/ :"
ls -la "$PUB"/apple-touch-icon.png "$PUB"/icon-192.png "$PUB"/icon-512.png "$PUB"/icon-512-maskable.png "$PUB"/og-image.png
