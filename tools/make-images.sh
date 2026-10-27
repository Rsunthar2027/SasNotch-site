#!/bin/zsh
# Renders public/og.png, public/apple-touch-icon.png and public/favicon-32.png
# from tools/og.html and tools/icons.html with headless Chrome.
# Usage: ./tools/make-images.sh   (needs Google Chrome and python3)
set -e
cd "${0:A:h}/.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PORT=4199
TMP=$(mktemp -d)
python3 -m http.server $PORT --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null; rm -rf "$TMP"' EXIT
sleep 1
shoot() { # url width height out
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$TMP/profile" \
    --default-background-color=00000000 --virtual-time-budget=2000 \
    --window-size=$2,$3 --screenshot="$4" "http://127.0.0.1:$PORT/$1" >/dev/null 2>&1
}
shoot tools/og.html 1200 630 public/og.png
shoot "tools/icons.html?icon=touch" 512 512 "$TMP/touch.png"
shoot "tools/icons.html?icon=foot" 512 512 "$TMP/foot.png"
sips -z 180 180 "$TMP/touch.png" --out public/apple-touch-icon.png >/dev/null
sips -z 32 32 "$TMP/foot.png" --out public/favicon-32.png >/dev/null
echo "Wrote public/og.png, public/apple-touch-icon.png, public/favicon-32.png"
