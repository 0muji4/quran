#!/usr/bin/env bash
#
# Generate committed Web, Android, and iOS app icons from a square SVG.
#
# Usage:
#   scripts/generate-app-icons.sh /path/to/app-icon.svg
#
# Requires:
#   - rsvg-convert
#   - ImageMagick's `magick`

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 /path/to/app-icon.svg" >&2
  exit 64
fi

SRC="$1"
if [[ ! -f "${SRC}" ]]; then
  echo "Icon source not found: ${SRC}" >&2
  exit 66
fi

if ! command -v rsvg-convert >/dev/null 2>&1; then
  echo "Missing required command: rsvg-convert" >&2
  exit 69
fi

if ! command -v magick >/dev/null 2>&1; then
  echo "Missing required command: magick" >&2
  exit 69
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_RES="${REPO_ROOT}/apps/android/src/main/res"
IOS_ICONSET="${REPO_ROOT}/apps/ios/Sources/QuranRecitationApp/Resources/Assets.xcassets/AppIcon.appiconset"

cp "${SRC}" "${REPO_ROOT}/apps/web/app/icon.svg"

generate_android_icon() {
  local density="$1"
  local icon_size="$2"
  local foreground_size="$3"
  local dir="${ANDROID_RES}/mipmap-${density}"
  local tmp_round

  tmp_round="$(mktemp -t quran-app-icon-round.XXXXXX)"

  rsvg-convert -w "${icon_size}" -h "${icon_size}" "${SRC}" -o "${dir}/ic_launcher.png"
  rsvg-convert -w "${icon_size}" -h "${icon_size}" "${SRC}" -o "${tmp_round}"
  magick "${tmp_round}" \
    \( -size "${icon_size}x${icon_size}" xc:black -fill white -draw "circle $((icon_size / 2)),$((icon_size / 2)) $((icon_size / 2)),0" \) \
    -alpha off -compose CopyOpacity -composite \
    "${dir}/ic_launcher_round.png"
  rm -f "${tmp_round}"
  rsvg-convert -w "${foreground_size}" -h "${foreground_size}" "${SRC}" -o "${dir}/ic_launcher_foreground.png"
}

generate_android_icon mdpi 48 108
generate_android_icon hdpi 72 162
generate_android_icon xhdpi 96 216
generate_android_icon xxhdpi 144 324
generate_android_icon xxxhdpi 192 432

rsvg-convert -w 40 -h 40 "${SRC}" -o "${IOS_ICONSET}/Icon-20@2x.png"
rsvg-convert -w 60 -h 60 "${SRC}" -o "${IOS_ICONSET}/Icon-20@3x.png"
rsvg-convert -w 58 -h 58 "${SRC}" -o "${IOS_ICONSET}/Icon-29@2x.png"
rsvg-convert -w 87 -h 87 "${SRC}" -o "${IOS_ICONSET}/Icon-29@3x.png"
rsvg-convert -w 80 -h 80 "${SRC}" -o "${IOS_ICONSET}/Icon-40@2x.png"
rsvg-convert -w 120 -h 120 "${SRC}" -o "${IOS_ICONSET}/Icon-40@3x.png"
rsvg-convert -w 120 -h 120 "${SRC}" -o "${IOS_ICONSET}/Icon-60@2x.png"
rsvg-convert -w 180 -h 180 "${SRC}" -o "${IOS_ICONSET}/Icon-60@3x.png"
rsvg-convert -w 20 -h 20 "${SRC}" -o "${IOS_ICONSET}/Icon-20.png"
rsvg-convert -w 40 -h 40 "${SRC}" -o "${IOS_ICONSET}/Icon-20-ipad@2x.png"
rsvg-convert -w 29 -h 29 "${SRC}" -o "${IOS_ICONSET}/Icon-29.png"
rsvg-convert -w 58 -h 58 "${SRC}" -o "${IOS_ICONSET}/Icon-29-ipad@2x.png"
rsvg-convert -w 40 -h 40 "${SRC}" -o "${IOS_ICONSET}/Icon-40.png"
rsvg-convert -w 80 -h 80 "${SRC}" -o "${IOS_ICONSET}/Icon-40-ipad@2x.png"
rsvg-convert -w 76 -h 76 "${SRC}" -o "${IOS_ICONSET}/Icon-76.png"
rsvg-convert -w 152 -h 152 "${SRC}" -o "${IOS_ICONSET}/Icon-76@2x.png"
rsvg-convert -w 167 -h 167 "${SRC}" -o "${IOS_ICONSET}/Icon-83.5@2x.png"
rsvg-convert -w 1024 -h 1024 "${SRC}" -o "${IOS_ICONSET}/Icon-1024.png"

echo "Generated app icons from ${SRC}"
