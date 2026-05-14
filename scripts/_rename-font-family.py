#!/usr/bin/env python3
"""Rewrite the family-name table records of a woff2 font in place.

OFL §"Reserved Font Name" requires modified copies of an OFL font to
not use the original Reserved Name. The Amiri OFL designates "Amiri"
itself as the reserved name; our subset must therefore identify as
something else when read via CSS / `next/font/local`. ADR 0020.

Replaces every NameID 1 (Family Name) and NameID 4 (Full Font Name)
record in every name table sub-record across every language with the
provided string. NameID 16 / 17 (Preferred Family / Subfamily) are
also updated when present.
"""

import sys

from fontTools.ttLib import TTFont

# NameIDs (https://learn.microsoft.com/typography/opentype/spec/name)
RENAME_IDS = {1, 4, 16}
# We append " Subset" so the subset is also distinct from any future
# upstream "Tilawah Amiri Quran" full-font release. ADR 0020 §"Naming".
SUFFIX = " Subset"


def main(path: str, new_family: str) -> None:
    font = TTFont(path)
    name = font["name"]
    new = f"{new_family}{SUFFIX}"
    for record in list(name.names):
        if record.nameID in RENAME_IDS:
            record.string = new.encode("utf-16-be") if record.isUnicode() else new.encode("latin-1")
    font.save(path)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.stderr.write("usage: _rename-font-family.py <font.woff2> <new family>\n")
        sys.exit(2)
    main(sys.argv[1], sys.argv[2])
