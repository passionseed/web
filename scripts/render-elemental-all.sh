#!/usr/bin/env bash
# Renders the five Elemental element videos, each a calm photo that one
# element corrupts from normal to sick, with sound:
#
#   scripts/render-elemental-all.sh [out-dir]      # default output/marketing/elemental-elements
#
# Writes <out>/<element>/elemental-<element>.mp4 (with sound, for Instagram)
# and .gif (silent) for earth, aether, water, fire and air. The five run at
# the same time; each takes about a minute or two. Needs node, python3 with
# numpy, and ffmpeg. The sound clips and their sources are in
# scripts/elemental-audio/README.md.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$(mkdir -p "${1:-$REPO/output/marketing/elemental-elements}" && cd "${1:-$REPO/output/marketing/elemental-elements}" && pwd)"
cd "$REPO"

# The scripts read WAV, so decode the clips once into a temp folder.
CLIPS="$(mktemp -d)"
trap 'rm -rf "$CLIPS"' EXIT
for f in scripts/elemental-audio/*.mp3; do
  ffmpeg -loglevel error -y -i "$f" -ac 2 -ar 44100 "$CLIPS/$(basename "${f%.mp3}").wav"
done

node scripts/render-elemental-earth.mjs --scene terraces --out "$OUT/earth" \
  --ambience "$CLIPS/rain-banana-field-felix-blume.wav" > "$OUT/earth.log" 2>&1 &
node scripts/render-elemental-aether.mjs --out "$OUT/aether" \
  --ambience "$CLIPS/rice-field-river-flowers.wav" > "$OUT/aether.log" 2>&1 &
node scripts/render-elemental-water.mjs --out "$OUT/water" \
  --ambience "$CLIPS/river-pfannkuchn.wav" > "$OUT/water.log" 2>&1 &
node scripts/render-elemental-fire.mjs --out "$OUT/fire" \
  --ambience "$CLIPS/wind-grass-ocean-in-a-drop.wav" \
  --fire "$CLIPS/fire-crackle-tosha73.wav" --fire2 "$CLIPS/fire-body-florianreichelt.wav" > "$OUT/fire.log" 2>&1 &
node scripts/render-elemental-air.mjs --out "$OUT/air" \
  --ambience "$CLIPS/wind-countryside-felix-blume.wav" \
  --factory "$CLIPS/factory-kyles.wav" > "$OUT/air.log" 2>&1 &

failed=0
for job in $(jobs -p); do wait "$job" || failed=1; done
for e in earth aether water fire air; do
  mp4="$(ls "$OUT/$e"/elemental-"$e"*.mp4 2>/dev/null | head -1 || true)"
  if [[ -n "$mp4" ]]; then echo "✅ $mp4"; else echo "❌ $e (see $OUT/$e.log)"; fi
done
exit $failed
