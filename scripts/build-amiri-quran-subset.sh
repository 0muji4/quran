#!/usr/bin/env bash
#
# Pre-build a Quran-subset Amiri woff2 pair for next/font/local (Phase
# 4.3-D, ADR 0020). Reads the canonical Quran text from db/seed_quran.sql,
# unions in a small UI Arabic / honorific allow-list, runs pyftsubset
# against the upstream Amiri TTFs, and writes the resulting woff2 files
# into apps/web/app/fonts/.
#
# Run once when:
#   - upstream Amiri releases a new version (bump AMIRI_VERSION)
#   - the Quran corpus changes (re-run `pnpm gen:quran-seed` first)
#   - UI Arabic copy adds new glyphs not already in seed_quran.sql
#
# Output binaries are committed to git so production builds don't need
# this tool installed. See apps/web/app/fonts/README.md for the
# regeneration recipe and OFL Reserved-Font-Name compliance notes.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SEED_SQL="${REPO_ROOT}/db/seed_quran.sql"
OUT_DIR="${REPO_ROOT}/apps/web/app/fonts"

AMIRI_VERSION="1.001"
AMIRI_RELEASE_URL="https://github.com/aliftype/amiri/releases/download/${AMIRI_VERSION}/Amiri-${AMIRI_VERSION}.zip"

WORK_DIR="$(mktemp -d -t amiri-subset.XXXXXX)"
trap 'rm -rf "${WORK_DIR}"' EXIT

cd "${WORK_DIR}"

echo "→ Downloading Amiri ${AMIRI_VERSION}…"
curl -sL -o amiri.zip "${AMIRI_RELEASE_URL}"
unzip -q amiri.zip
SRC_DIR="${WORK_DIR}/Amiri-${AMIRI_VERSION}"

# Copy OFL.txt next to the woff2 outputs. Modified copies of an OFL
# font may not use the original Reserved Font Name "Amiri"; the next
# step renames the font family to "Tilawah Amiri Quran" so the rule
# is respected. See ADR 0020 §"OFL Reserved Font Name compliance".
cp "${SRC_DIR}/OFL.txt" "${OUT_DIR}/OFL.txt"

echo "→ Extracting Quran codepoints from ${SEED_SQL}…"
python3 "${REPO_ROOT}/scripts/_extract-quran-codepoints.py" "${SEED_SQL}" \
  > "${WORK_DIR}/codepoints.txt"
echo "   $(wc -l < "${WORK_DIR}/codepoints.txt") unique codepoints"

subset_one () {
  local src="$1" out="$2" family="$3"
  echo "→ Subsetting ${src##*/} → ${out##*/}"
  python3 -m fontTools.subset \
    "${src}" \
    --unicodes-file="${WORK_DIR}/codepoints.txt" \
    --output-file="${out}" \
    --flavor=woff2 \
    --layout-features='*' \
    --no-hinting \
    --desubroutinize \
    --name-IDs='*' \
    --name-legacy \
    --notdef-outline \
    --recommended-glyphs \
    --no-prune-unicode-ranges \
    --no-glyph-names
  # Rewrite the font family name to satisfy OFL §"Reserved Font Name".
  # The post-rename string is what CSS / next/font/local sees.
  python3 "${REPO_ROOT}/scripts/_rename-font-family.py" "${out}" "${family}"
  echo "   $(stat -f '%z' "${out}" 2>/dev/null || stat -c '%s' "${out}") bytes"
}

mkdir -p "${OUT_DIR}"
subset_one "${SRC_DIR}/Amiri-Regular.ttf" "${OUT_DIR}/amiri-quran-subset-regular.woff2" "Tilawah Amiri Quran"
subset_one "${SRC_DIR}/Amiri-Bold.ttf"    "${OUT_DIR}/amiri-quran-subset-bold.woff2"    "Tilawah Amiri Quran"

echo "✓ Done. Commit ${OUT_DIR}/*.woff2 + ${OUT_DIR}/OFL.txt"
