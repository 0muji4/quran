package com.quran.android.designsystem

import androidx.compose.runtime.Immutable
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * Brand typography. Latin copy uses the system sans-serif; serif faces
 * fall back to the system serif (New York on iOS, Noto Serif on Android).
 *
 * Mirrors `apps/ios/Sources/QuranRecitationApp/DesignSystem/Typography.swift`.
 *
 * Arabic ayah text uses `FontFamily.Serif` for now; a future translator-
 * driven PR may bundle a Quran-specific Arabic font (e.g. Amiri Quran)
 * under `res/font/` per ADR 0009. See PR 25.
 */
@Immutable
data class BrandTypography(
    val pageTitle: TextStyle,
    val sectionTitle: TextStyle,
    val eyebrow: TextStyle,
    val body: TextStyle,
    val caption: TextStyle,
    val arabicAyah: TextStyle,
    val scoreDisplay: TextStyle,
)

val BrandTypographyDefault = BrandTypography(
    pageTitle = TextStyle(
        fontFamily = FontFamily.Serif,
        fontSize = 34.sp,
        fontWeight = FontWeight.Normal,
    ),
    sectionTitle = TextStyle(
        fontSize = 20.sp,
        fontWeight = FontWeight.SemiBold,
    ),
    eyebrow = TextStyle(
        fontSize = 12.sp,
        fontWeight = FontWeight.SemiBold,
        letterSpacing = 0.6.sp,
    ),
    body = TextStyle(
        fontSize = 16.sp,
        fontWeight = FontWeight.Normal,
    ),
    caption = TextStyle(
        fontSize = 14.sp,
        fontWeight = FontWeight.Normal,
    ),
    arabicAyah = TextStyle(
        fontFamily = FontFamily.Serif,
        fontSize = 32.sp,
        fontWeight = FontWeight.Normal,
    ),
    scoreDisplay = TextStyle(
        fontFamily = FontFamily.Serif,
        fontSize = 56.sp,
        fontWeight = FontWeight.Normal,
    ),
)
