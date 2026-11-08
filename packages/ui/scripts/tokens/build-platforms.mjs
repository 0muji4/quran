// Stage 2 entry point: semantic tokens (layer 3) → platform code (layer 4).
//
//   Android  designsystem/generated/ColorTokens.kt, DimensionTokens.kt
//   iOS      DesignSystem/Generated/ColorTokens.swift, DimensionTokens.swift
//
// Usage: node packages/ui/scripts/tokens/build-platforms.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderKotlin } from './kotlin.mjs';
import { loadSemanticTokens } from './load.mjs';
import { writeOwnedDir } from './output.mjs';
import { renderSwift } from './swift.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, '..', '..', '..', '..');

const ANDROID_DIR = join(
  repoRoot,
  'apps/android/src/main/java/com/tilawah/android/designsystem/generated'
);
const IOS_DIR = join(repoRoot, 'apps/ios/Sources/QuranRecitationApp/DesignSystem/Generated');

const tokens = await loadSemanticTokens(join(scriptDir, '..', '..', 'tokens'));

writeOwnedDir(ANDROID_DIR, renderKotlin(tokens));
writeOwnedDir(IOS_DIR, renderSwift(tokens));
