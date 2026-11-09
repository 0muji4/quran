#!/usr/bin/env python3
"""Rewrite the family-name table records of a woff2 font in place.

OFL §"Reserved Font Name" requires modified copies of an OFL font to
not use the original Reserved Name. The Amiri OFL designates "Amiri"
itself as the reserved name; our subset must therefore identify as
something else when read via CSS / `next/font/local`. ADR 0020.

Replaces every NameID 1 (Family Name), NameID 4 (Full Font Name) and
NameID 16 (Preferred Family) record across every platform and language
with the provided string, and NameID 6 (PostScript Name) with the same
name without spaces plus the style, for example
"TilawahAmiriQuranSubset-Regular". The PostScript name is the name iOS
looks a font up by, so it must not keep the reserved name either.
"""

import sys

from fontTools.ttLib import TTFont

# NameIDs (https://learn.microsoft.com/typography/opentype/spec/name)
RENAME_IDS = {1, 4, 16}
# We append " Subset" so the subset is also distinct from any future
# upstream "Tilawah Amiri Quran" full-font release. ADR 0020 §"Naming".
SUFFIX = " Subset"


POSTSCRIPT_NAME_ID = 6
SUBFAMILY_NAME_ID = 2


def main(path: str, new_family: str) -> None:
    # Keep the source's modification time so a re-run reproduces the same bytes.
    font = TTFont(path, recalcTimestamp=False)
    name = font["name"]
    new = f"{new_family}{SUFFIX}"
    style = name.getDebugName(SUBFAMILY_NAME_ID) or "Regular"
    postscript = f"{new.replace(' ', '')}-{style.replace(' ', '')}"
    for record in list(name.names):
        if record.nameID in RENAME_IDS:
            value = new
        elif record.nameID == POSTSCRIPT_NAME_ID:
            value = postscript
        else:
            continue
        record.string = value.encode("utf-16-be") if record.isUnicode() else value.encode("latin-1")
    font.save(path)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.stderr.write("usage: _rename-font-family.py <font.woff2> <new family>\n")
        sys.exit(2)
    main(sys.argv[1], sys.argv[2])
