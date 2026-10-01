#!/bin/sh
# ShopFlow build – writes dist/, the files Webflow loads from jsDelivr.
# Edit the sources in javascript/, run `sh build.sh`, commit, then release (see README).
set -e
cd "$(dirname "$0")"
SRC=javascript
OUT=dist
mkdir -p "$OUT"

bundle() { # bundle <output> <files...>
  out="$1"; shift
  {
    echo "/* ShopFlow – $(basename "$out") – built from: $* */"
    for f in "$@"; do echo; cat "$SRC/$f"; done
  } > "$OUT/$out"
}

# ShopFlow Core (every page, Page Shell): page stability + sheet + bottom nav + consent + ShopFlow nav/brand bar + quick add + size labels + cart page background
bundle shopflow-core.css shopflow-page-stability.css shopflow-announcement.css shopflow-sheet.css core-bottom-nav.css core-consent.css shopflow-brand-bar.css shopflow-quick-add.css shopflow-size-labels.css shopflow-cart-page-bg.css
bundle shopflow-core.js  shopflow-announcement.js shopflow-sheet.js core-bottom-nav.js core-consent.js shopflow-nav-experience.js shopflow-store-fill.js shopflow-quick-add.js shopflow-size-labels.js

# Single-feature files (copied as-is)
for f in shopflow-pdp shopflow-cart-drawer shopflow-mobile-nav shopflow-collection-filters; do
  cp "$SRC/$f.css" "$OUT/$f.css"
  cp "$SRC/$f.js"  "$OUT/$f.js"
done

ls -l "$OUT"
