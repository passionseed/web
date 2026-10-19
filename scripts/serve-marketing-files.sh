#!/bin/zsh
# Serves output/marketing on http://127.0.0.1:8765 so Aside's sandboxed REPL
# can fetch slide PNGs and PDFs for upload (it cannot read the repo directly).
# Localhost only. Stop with Ctrl-C, or: pkill -f "http.server 8765".
cd "${0:A:h}/../output/marketing" || exit 1
exec python3 -m http.server 8765 --bind 127.0.0.1
