#!/usr/bin/env python3
"""Extract the unique Unicode codepoints used in db/seed_quran.sql plus
a small UI allow-list, formatted as one U+HHHH per line for
pyftsubset's --unicodes-file option.

Companion to scripts/build-amiri-quran-subset.sh. Phase 4.3-D / ADR 0020.

Approach: read every 'Arabic text' SQL string literal (we conservatively
treat any single-quoted segment containing a U+06xx character as Quran
text), union the codepoint set, then add a UI allow-list covering:
  - Arabic-Indic digit forms used by surah-number rendering
  - U+FDFA SALLA SAW honorific (peace-be-upon-him glyph)
  - Common ASCII space + punctuation that appears mixed into Arabic
    strings (e.g. line breaks, parentheses around verse numbers).
"""

import re
import sys

ARABIC_RANGE = re.compile(r"[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]")

# Glyphs that may not appear in seed_quran.sql but are needed by the
# UI rendering Arabic text (surah names, ornamental punctuation, etc.).
UI_ALLOWLIST = {
    # Arabic-Indic digits (used in numerals folded into Arabic text)
    0x0660, 0x0661, 0x0662, 0x0663, 0x0664,
    0x0665, 0x0666, 0x0667, 0x0668, 0x0669,
    # Tajweed / Tilawah honorifics commonly inlined by UI copy
    0x06DD,  # END OF AYAH
    0x06DE,  # START OF RUB EL HIZB
    0xFDF2,  # ALLAH ligature
    0xFDFA,  # SALLA SAW
    0xFDFD,  # BISMILLAH ligature (sometimes used)
    # Whitespace + punctuation that bleeds through
    0x0020,  # SPACE
    0x00A0,  # NO-BREAK SPACE
    0x060C,  # ARABIC COMMA
    0x061B,  # ARABIC SEMICOLON
    0x061F,  # ARABIC QUESTION MARK
}


def main(path: str) -> None:
    points: set[int] = set(UI_ALLOWLIST)
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            for match in ARABIC_RANGE.finditer(line):
                points.add(ord(match.group(0)))
    for cp in sorted(points):
        print(f"U+{cp:04X}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.stderr.write("usage: _extract-quran-codepoints.py <seed_quran.sql>\n")
        sys.exit(2)
    main(sys.argv[1])
