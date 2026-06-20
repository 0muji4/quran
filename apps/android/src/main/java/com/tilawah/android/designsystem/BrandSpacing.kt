package com.tilawah.android.designsystem

import androidx.compose.runtime.Immutable
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Layout spacing scale derived from `docs/design/Android *.png`. Use
 * these instead of hard-coded `dp` values so a future scale tweak is
 * one edit. The core steps (xs…xxl) align with
 * `apps/ios/Sources/QuranRecitationApp/DesignSystem/Spacing.swift`; the
 * Android exports also use a 40dp step (xxxl) and 10/14dp corner radii
 * (radiusSm/radiusMd) that iOS has not adopted yet — see the iOS-sync
 * follow-up noted on [BrandColors].
 */
@Immutable
data class BrandSpacing(
    val xs: Dp,
    val sm: Dp,
    val md: Dp,
    /** 16dp — the standard scale step. */
    val lg: Dp,
    val xl: Dp,
    /** 32dp scale step. */
    val xxl: Dp,
    /** 40dp scale step. */
    val xxxl: Dp,
    val screenHorizontal: Dp,
    val cardCornerRadius: Dp,
    /** Small corner radius (chips inner, tiles). */
    val radiusSm: Dp,
    /** Medium corner radius (cards, fields) — 14dp per Figma. */
    val radiusMd: Dp,
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
    xxxl = 40.dp,
    screenHorizontal = 16.dp,
    cardCornerRadius = 16.dp,
    radiusSm = 10.dp,
    radiusMd = 14.dp,
    minTapTarget = 48.dp,
)
