# Self-hosted fonts

This directory holds the woff2 files loaded through `next/font/local` in
`apps/web/app/[locale]/layout.tsx`. Self-hosting keeps the web build independent
of Google Fonts.

## Files

- `amiri-quran-subset-regular.woff2` — Quran-glyph subset of `Amiri-Regular.ttf`
- `amiri-quran-subset-bold.woff2` — Quran-glyph subset of `Amiri-Bold.ttf`
- `OFL.txt` — SIL Open Font License v1.1, distributed alongside the Amiri woff2 files per OFL §"Distribution"
- `cormorant-garamond-latin-variable.woff2` — Latin variable font from Google Fonts (`v21`)
- `inter-latin-variable.woff2` — Latin variable font from Google Fonts (`v20`)
- `OFL-cormorant-garamond.txt`, `OFL-inter.txt` — their SIL Open Font License v1.1 texts

## Regenerating Amiri

The Amiri woff2 files are committed binaries; production builds do not need
the subsetting toolchain. Regenerate when:

- Upstream Amiri ships a new release (bump `AMIRI_VERSION` in the script)
- The Quran corpus changes (re-run `pnpm gen:quran-seed` first so the
  codepoint set in `db/seed_quran.sql` is current)
- UI Arabic copy adds glyphs not already in `seed_quran.sql` — add them
  to the `UI_ALLOWLIST` in `scripts/_extract-quran-codepoints.py`

One-shot prerequisites (only needed for regeneration):

```bash
python3 -m pip install --user 'fonttools==4.68.0' 'brotli==1.2.1'
export PATH="$HOME/Library/Python/3.9/bin:$PATH"  # on macOS
```

Then:

```bash
./scripts/build-amiri-quran-subset.sh web
```

Without an argument the script also writes the Android TTF
(`apps/android/src/main/res/font/`, ADR 0028).

Commit the regenerated `*.woff2` files. The script also refreshes
`OFL.txt` from the upstream zip so the license file always matches the
exact source release the subset was built from.

## OFL Reserved Font Name compliance

Amiri is distributed under the SIL OFL with `"Amiri"` as the Reserved
Font Name. OFL §5 forbids modified copies (which a subset is) from
using the reserved name in their internal name records. The subsetting
script rewrites the Family Name (NameID 1), Full Font Name (NameID 4) and
Preferred Family (NameID 16) records to `"Tilawah Amiri Quran Subset"`,
and the PostScript Name (NameID 6) to `"TilawahAmiriQuranSubset-Regular"`
or `"…-Bold"`, via `scripts/_rename-font-family.py`, so the file
identifies as a derivative.

The CSS `font-family` declaration in `layout.tsx` therefore loads under
this new name; no legal exposure even if the file is downloaded
standalone and inspected.

## License

Both woff2 files inherit the SIL OFL v1.1 from the upstream `Amiri-Regular.ttf`
and `Amiri-Bold.ttf` sources. See `OFL.txt` in this directory.
