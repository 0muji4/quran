package com.tilawah.android.designsystem

import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color

/**
 * Brand palette sampled from `docs/design/Android *.png` (the visual
 * source of truth for the Android app). Values were re-derived by
 * pixel-sampling the Figma exports rather than copied from iOS, so the
 * historical "matches iOS Colors.swift one-for-one" invariant no longer
 * holds — a few hues (notably [primary] teal and the selected-chip ink)
 * drifted from the hand-picked iOS values. Keeping the two platforms in
 * sync is now a deliberate follow-up (see plan / iOS sync PR), not an
 * automatic property of this file.
 *
 * Dark mode is deferred — the design is light-only at this stage.
 * When dark mode is needed, swap each value behind a `MaterialTheme`
 * dynamic resource overlay or expose two `BrandColors` instances.
 */
@Immutable
data class BrandColors(
    val surface: Color,
    /** Warm off-white card surface (search field, soft panels). */
    val card: Color,
    /** Pure-white card surface (surah list rows). */
    val paper: Color,
    /**
     * Inverted (dark) brand surface, repointed from warm brown to forest
     * green by the #462 design refresh. Cream [textOnInverse] /
     * [goldOnDark] stay WCAG AA on it.
     */
    val cardInverse: Color,
    val primary: Color,
    /** Gold surface (CTA backgrounds, accents). Pair with dark text. */
    val accent: Color,
    /** Gold text on light (cream/paper) surfaces — clears WCAG AA. */
    val goldOnLight: Color,
    /** Gold text/value on the dark (forest-green) surface. */
    val goldOnDark: Color,
    val recording: Color,
    val success: Color,
    val tile: Color,
    /** Near-white pill fill for unselected filter chips. */
    val tileSoft: Color,
    /** Pale mint surface (mashallah pill, matched word tiles). */
    val mintBg: Color,
    /** Dark-green ink legible on [mintBg]. */
    val mintInk: Color,
    /** Light hairline border for cards / fields. */
    val borderDefault: Color,
    /** Gold hairline border (selected surah row). */
    val borderStrong: Color,
    val decorative: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val textOnInverse: Color,
    val textOnPrimary: Color,
)

val BrandColorsLight = BrandColors(
    surface = Color(0xFFF7F3EC),
    card = Color(0xFFFAF6EC),
    paper = Color(0xFFFFFFFF),
    cardInverse = Color(0xFF0E3D2B),
    primary = Color(0xFF106840),
    accent = Color(0xFFC0894A),
    goldOnLight = Color(0xFF6E4F1E),
    goldOnDark = Color(0xFFD9B26A),
    recording = Color(0xFFC75736),
    success = Color(0xFF4F7C5C),
    tile = Color(0xFFEADBC5),
    tileSoft = Color(0xFFF8F5F1),
    mintBg = Color(0xFFE4EEEB),
    mintInk = Color(0xFF164842),
    borderDefault = Color(0xFFE5DCC9),
    borderStrong = Color(0xFFB8893C),
    decorative = Color(0xFFB98B3D),
    textPrimary = Color(0xFF1A1311),
    textSecondary = Color(0xFF6B6258),
    textOnInverse = Color(0xFFF7F3EC),
    textOnPrimary = Color.White,
)
