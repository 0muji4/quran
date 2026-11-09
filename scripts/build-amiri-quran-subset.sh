#!/usr/bin/env bash
#
# Pre-build the Quran-subset Amiri fonts (ADR 0020, ADR 0028). Reads the
# canonical Quran text from db/seed_quran.sql, unions in a small UI Arabic /
# honorific allow-list, runs pyftsubset against the upstream Amiri TTFs, and
# writes the outputs named on the command line (all of them by default):
#
#   web      woff2 Regular + Bold into apps/web/app/fonts/ (next/font/local)
#   android  TTF Regular into apps/android/src/main/res/font/
#   ios      TTF Regular into apps/ios/Sources/QuranRecitationApp/Resources/Fonts/
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
WEB_DIR="${REPO_ROOT}/apps/web/app/fonts"
ANDROID_FONT_DIR="${REPO_ROOT}/apps/android/src/main/res/font"
ANDROID_LICENSE_DIR="${REPO_ROOT}/apps/android/src/main/assets/licenses"
IOS_FONT_DIR="${REPO_ROOT}/apps/ios/Sources/QuranRecitationApp/Resources/Fonts"

TARGETS=("$@")
if [ ${#TARGETS[@]} -eq 0 ]; then
  TARGETS=(web android ios)
fi
for target in "${TARGETS[@]}"; do
  case "${target}" in
    web | android | ios) ;;
    *) echo "unknown output: ${target} (expected web, android or ios)" >&2; exit 2 ;;
  esac
done
wants () {
  local target
  for target in "${TARGETS[@]}"; do
    [ "${target}" = "$1" ] && return 0
  done
  return 1
}

AMIRI_VERSION="1.001"
AMIRI_RELEASE_URL="https://github.com/aliftype/amiri/releases/download/${AMIRI_VERSION}/Amiri-${AMIRI_VERSION}.zip"

# The subset's bytes depend on these versions. Pin them so a re-run with the
# same inputs reproduces the committed files.
FONTTOOLS_VERSION="4.68.0"
BROTLI_VERSION="1.2.1"
python3 - "${FONTTOOLS_VERSION}" "${BROTLI_VERSION}" <<'PY'
import sys
import brotli
import fontTools

want_fonttools, want_brotli = sys.argv[1], sys.argv[2]
if (fontTools.version, brotli.__version__) != (want_fonttools, want_brotli):
    sys.exit(
        f"Need fonttools {want_fonttools} and brotli {want_brotli}, "
        f"have {fontTools.version} and {brotli.__version__}. "
        "See apps/web/app/fonts/README.md."
    )
PY

WORK_DIR="$(mktemp -d -t amiri-subset.XXXXXX)"
trap 'rm -rf "${WORK_DIR}"' EXIT

cd "${WORK_DIR}"

echo "→ Downloading Amiri ${AMIRI_VERSION}…"
curl -sL -o amiri.zip "${AMIRI_RELEASE_URL}"
unzip -q amiri.zip
SRC_DIR="${WORK_DIR}/Amiri-${AMIRI_VERSION}"


echo "→ Extracting Quran codepoints from ${SEED_SQL}…"
python3 "${REPO_ROOT}/scripts/_extract-quran-codepoints.py" "${SEED_SQL}" \
  > "${WORK_DIR}/codepoints.txt"
echo "   $(wc -l < "${WORK_DIR}/codepoints.txt") unique codepoints"

# flavor: "woff2" for Web, "" for a plain TTF (Android and iOS cannot read woff2).
subset_one () {
  local src="$1" out="$2" family="$3" flavor="$4"
  echo "→ Subsetting ${src##*/} → ${out##*/}"
  python3 -m fontTools.subset \
    "${src}" \
    --unicodes-file="${WORK_DIR}/codepoints.txt" \
    --output-file="${out}" \
    ${flavor:+--flavor="${flavor}"} \
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

# Modified copies of an OFL font may not use the Reserved Font Name "Amiri",
# so every output is renamed to "Tilawah Amiri Quran Subset", and each ships
# with the upstream OFL.txt. See ADR 0020 §"OFL Reserved Font Name compliance".
if wants web; then
  mkdir -p "${WEB_DIR}"
  cp "${SRC_DIR}/OFL.txt" "${WEB_DIR}/OFL.txt"
  subset_one "${SRC_DIR}/Amiri-Regular.ttf" "${WEB_DIR}/amiri-quran-subset-regular.woff2" "Tilawah Amiri Quran" woff2
  subset_one "${SRC_DIR}/Amiri-Bold.ttf"    "${WEB_DIR}/amiri-quran-subset-bold.woff2"    "Tilawah Amiri Quran" woff2
fi

if wants android; then
  mkdir -p "${ANDROID_FONT_DIR}" "${ANDROID_LICENSE_DIR}"
  cp "${SRC_DIR}/OFL.txt" "${ANDROID_LICENSE_DIR}/OFL-amiri.txt"
  subset_one "${SRC_DIR}/Amiri-Regular.ttf" "${ANDROID_FONT_DIR}/tilawah_amiri_quran_regular.ttf" "Tilawah Amiri Quran" ""
fi

if wants ios; then
  mkdir -p "${IOS_FONT_DIR}"
  cp "${SRC_DIR}/OFL.txt" "${IOS_FONT_DIR}/OFL-amiri.txt"
  subset_one "${SRC_DIR}/Amiri-Regular.ttf" "${IOS_FONT_DIR}/TilawahAmiriQuranSubset-Regular.ttf" "Tilawah Amiri Quran" ""
fi

echo "✓ Done. Commit the regenerated fonts and license files."
