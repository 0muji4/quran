package com.quran.android.designsystem

import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color

/**
 * Brand palette extracted from `docs/design/Android *.png`. Hex values
 * match `apps/ios/Sources/QuranRecitationApp/DesignSystem/Colors.swift`
 * one-for-one so the two platforms render identical surfaces.
 *
 * Dark mode is deferred — the design is light-only at this stage.
 * When dark mode is needed, swap each value behind a `MaterialTheme`
 * dynamic resource overlay or expose two `BrandColors` instances.
 */
@Immutable
data class BrandColors(
    val surface: Color,
    val card: Color,
    val cardInverse: Color,
    val primary: Color,
    val accent: Color,
    val recording: Color,
    val success: Color,
    val tile: Color,
    val decorative: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val textOnInverse: Color,
    val textOnPrimary: Color,
)

val BrandColorsLight = BrandColors(
    surface = Color(0xFFF5EFE2),
    card = Color(0xFFFAF6EC),
    cardInverse = Color(0xFF221814),
    primary = Color(0xFF2A6F75),
    accent = Color(0xFFC0894A),
    recording = Color(0xFFC75736),
    success = Color(0xFF4F7C5C),
    tile = Color(0xFFEADBC5),
    decorative = Color(0xFFB98B3D),
    textPrimary = Color(0xFF1A1311),
    textSecondary = Color(0xFF6B6258),
    textOnInverse = Color(0xFFF5EFE2),
    textOnPrimary = Color.White,
)
