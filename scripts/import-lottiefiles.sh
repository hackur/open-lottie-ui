#!/usr/bin/env bash
# USE WHEN: importing a single free LottieFiles animation into library/ for reference.
# WHAT THIS DOES:
#   1. Downloads the dotLottie archive from assets-v2.lottiefiles.com
#   2. Extracts the inner animations/*.json -> library/<slug>/animation.json
#   3. Writes meta.json with source URL, author, license, content hash
# USAGE: ./scripts/import-lottiefiles.sh <page_url> <asset_url> <slug> <title> <author>
# RELATED: docs/workflows/import.md, library/, decisions.jsonl
set -euo pipefail

PAGE_URL="${1:?page url required}"
ASSET_URL="${2:?asset .lottie url required}"
SLUG="${3:?slug required}"
TITLE="${4:?title required}"
AUTHOR="${5:?author required}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMPDIR="$(mktemp -d)"
trap "rm -rf $TMPDIR" EXIT

echo "→ fetching $ASSET_URL"
curl -fsSL -o "$TMPDIR/in.lottie" "$ASSET_URL"

unzip -q "$TMPDIR/in.lottie" -d "$TMPDIR/unpacked"
ANIM_JSON="$(find "$TMPDIR/unpacked/animations" -name '*.json' | head -1)"
[[ -n "$ANIM_JSON" ]] || { echo "no animation json in archive"; exit 1; }

HASH="$(shasum -a 256 "$ANIM_JSON" | awk '{print $1}')"
SHORT="${HASH:0:6}"
DATE="$(date -u +%Y-%m-%d)"
DIR="$ROOT/library/${DATE}_${SLUG}_${SHORT}"
mkdir -p "$DIR"

cp "$ANIM_JSON" "$DIR/animation.json"
if [[ -d "$TMPDIR/unpacked/images" ]]; then
  cp -R "$TMPDIR/unpacked/images" "$DIR/images"
fi
cp "$TMPDIR/in.lottie" "$DIR/source.lottie"

# Intrinsic fields from the animation json
FR=$(jq -r '.fr // 0' "$ANIM_JSON")
IP=$(jq -r '.ip // 0' "$ANIM_JSON")
OP=$(jq -r '.op // 0' "$ANIM_JSON")
W=$(jq -r '.w // 0' "$ANIM_JSON")
H=$(jq -r '.h // 0' "$ANIM_JSON")
LAYERS=$(jq -r '(.layers // []) | length' "$ANIM_JSON")
BYTES=$(wc -c < "$ANIM_JSON" | tr -d ' ')

jq -n \
  --arg id "${DATE}_${SLUG}_${SHORT}" \
  --arg slug "$SLUG" \
  --arg title "$TITLE" \
  --arg author "$AUTHOR" \
  --arg page "$PAGE_URL" \
  --arg asset "$ASSET_URL" \
  --arg hash "sha256:$HASH" \
  --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --argjson fr "$FR" --argjson ip "$IP" --argjson op "$OP" \
  --argjson w "$W" --argjson h "$H" --argjson layers "$LAYERS" --argjson bytes "$BYTES" \
  '{
    id: $id, slug: $slug, title: $title,
    tags: ["lottiefiles-import"],
    source: "lottiefiles",
    source_url: $page,
    asset_url: $asset,
    author: $author,
    license_id: "LottieSimpleLicense",
    license_url: "https://lottiefiles.com/page/license",
    attribution_required: true,
    attribution_text: ("Animation by " + $author + " on LottieFiles"),
    imported_at: $ts,
    imported_by: "import-lottiefiles.sh",
    content_hash: $hash,
    intrinsic: { fr: $fr, ip: $ip, op: $op, w: $w, h: $h, layer_count: $layers, size_bytes: $bytes },
    from_generation: null
  }' > "$DIR/meta.json"

echo "✓ imported: $DIR"
echo "  $W×$H  ${LAYERS}L  ${BYTES}B  hash=${SHORT}"
