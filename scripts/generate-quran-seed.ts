/**
 * Generate db/seed_quran.sql from risan/quran-json (a published JSON dataset
 * derived verbatim from the Tanzil Uthmani text).
 *
 * Usage:
 *   pnpm gen:quran-seed
 *
 * The output file is committed to the repository so that `make db-seed` does
 * not require network access. Re-run this script when the upstream dataset is
 * bumped (update QURAN_JSON_REF below) or when the seed schema changes.
 *
 * Source: https://github.com/risan/quran-json (MIT license, wrapping Tanzil
 * Uthmani text licensed under CC BY-ND 3.0). The Arabic text is preserved
 * byte-for-byte, in line with the No-Derivatives requirement; only INSERT
 * statements are generated around it.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const QURAN_JSON_REF = "v3.1.2"; // pin upstream version for reproducibility
const QURAN_JSON_URL = `https://raw.githubusercontent.com/risan/quran-json/${QURAN_JSON_REF}/dist/quran.json`;
const OUTPUT_PATH = resolve(__dirname, "..", "db", "seed_quran.sql");

interface UpstreamVerse {
  id: number;
  text: string;
}

interface UpstreamSurah {
  id: number;
  name: string;
  transliteration: string;
  type: "meccan" | "medinan";
  total_verses: number;
  verses: UpstreamVerse[];
}

const REVELATION_PLACE: Record<UpstreamSurah["type"], string> = {
  meccan: "Mecca",
  medinan: "Medina",
};

// Postgres single-quote escape: '' for literal apostrophes (rare in the
// Uthmani text but defensive). Newlines are not expected.
function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

async function main(): Promise<void> {
  console.log(`Fetching ${QURAN_JSON_URL}`);
  const response = await fetch(QURAN_JSON_URL);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch quran-json: ${response.status} ${response.statusText}`,
    );
  }
  const surahs = (await response.json()) as UpstreamSurah[];

  if (surahs.length !== 114) {
    throw new Error(`Expected 114 surahs, got ${surahs.length}`);
  }
  const totalVerses = surahs.reduce((sum, s) => sum + s.verses.length, 0);
  if (totalVerses !== 6236) {
    throw new Error(`Expected 6236 ayahs, got ${totalVerses}`);
  }

  const lines: string[] = [];
  lines.push(
    "-- AUTO-GENERATED FILE. DO NOT EDIT BY HAND.",
    "-- Regenerate with: pnpm gen:quran-seed",
    "--",
    "-- Quran text in this file is sourced verbatim from the Tanzil Uthmani",
    "-- text via risan/quran-json (https://github.com/risan/quran-json) at",
    `-- tag ${QURAN_JSON_REF}.`,
    "--",
    "-- Tanzil text is licensed under CC BY-ND 3.0",
    "-- (https://creativecommons.org/licenses/by-nd/3.0/). The Arabic content",
    "-- below is reproduced without modification; only INSERT statements are",
    "-- added around it.",
    "",
    "BEGIN;",
    "",
    "-- Surahs ----------------------------------------------------------------",
    "INSERT INTO surahs (id, name_ar, name_en, revelation_place, ayah_count) VALUES",
  );

  const surahValues = surahs.map((surah) => {
    const place = REVELATION_PLACE[surah.type];
    if (!place) {
      throw new Error(`Unknown surah type ${surah.type} for surah ${surah.id}`);
    }
    return `  (${surah.id}, ${sqlString(surah.name)}, ${sqlString(
      surah.transliteration,
    )}, ${sqlString(place)}, ${surah.verses.length})`;
  });
  lines.push(surahValues.join(",\n") + "");
  lines.push("ON CONFLICT (id) DO UPDATE SET");
  lines.push("  name_ar = EXCLUDED.name_ar,");
  lines.push("  name_en = EXCLUDED.name_en,");
  lines.push("  revelation_place = EXCLUDED.revelation_place,");
  lines.push("  ayah_count = EXCLUDED.ayah_count,");
  lines.push("  updated_at = NOW();");
  lines.push("");

  // Ayahs - one INSERT per surah keeps statement size manageable for psql.
  lines.push(
    "-- Ayahs -----------------------------------------------------------------",
  );
  for (const surah of surahs) {
    lines.push(
      `-- Surah ${surah.id}: ${surah.transliteration} (${surah.verses.length} ayahs)`,
    );
    lines.push("INSERT INTO ayahs (surah_id, ayah_number, text_ar) VALUES");
    const ayahValues = surah.verses.map(
      (verse) =>
        `  (${surah.id}, ${verse.id}, ${sqlString(verse.text)})`,
    );
    lines.push(ayahValues.join(",\n") + "");
    lines.push("ON CONFLICT (surah_id, ayah_number) DO UPDATE SET");
    lines.push("  text_ar = EXCLUDED.text_ar,");
    lines.push("  updated_at = NOW();");
    lines.push("");
  }

  lines.push("COMMIT;");
  lines.push("");

  const sql = lines.join("\n");
  writeFileSync(OUTPUT_PATH, sql, "utf8");

  console.log(
    `Wrote ${OUTPUT_PATH}: ${surahs.length} surahs, ${totalVerses} ayahs.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
