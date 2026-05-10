package com.tilawah.android.designsystem

import androidx.compose.runtime.Immutable
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Layout spacing scale derived from `docs/design/Android *.png`. Use
 * these instead of hard-coded `dp` values so a future scale tweak is
 * one edit. Values match
 * `apps/ios/Sources/QuranRecitationApp/DesignSystem/Spacing.swift`.
 */
@Immutable
data class BrandSpacing(
    val xs: Dp,
    val sm: Dp,
    val md: Dp,
    val lg: Dp,
    val xl: Dp,
    val xxl: Dp,
    val screenHorizontal: Dp,
    val cardCornerRadius: Dp,
    /** Minimum tap target per WCAG 2.5.5 (48dp on Android). */
    val minTapTarget: Dp,
)

val BrandSpacingDefault = BrandSpacing(
    xs = 4.dp,
    sm = 8.dp,
    md = 12.dp,
    lg = 16.dp,
    xl = 24.dp,
    xxl = 32.dp,
    screenHorizontal = 16.dp,
    cardCornerRadius = 16.dp,
    minTapTarget = 48.dp,
)
