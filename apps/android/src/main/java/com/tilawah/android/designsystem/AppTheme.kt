package com.tilawah.android.designsystem

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import com.tilawah.android.designsystem.generated.AppColors
import com.tilawah.android.designsystem.generated.DarkAppColors
import com.tilawah.android.designsystem.generated.DarkColorScheme
import com.tilawah.android.designsystem.generated.LightAppColors
import com.tilawah.android.designsystem.generated.LightColorScheme
import com.tilawah.android.designsystem.generated.TokenShape
import com.tilawah.android.designsystem.generated.TokenSpacing

/**
 * Layer 5 of the design system (ADR 0026): binds the generated tokens in
 * `designsystem.generated` to Compose. This is the only main-source file
 * outside that package that imports it; components and screens read
 * colours, spacing and shapes through [AppTheme].
 *
 * - Material 3 roles: [colorScheme], backed by `MaterialTheme.colorScheme`,
 *   so Material components use them with no mapping.
 * - Roles Material 3 has no slot for (recording, verdicts, ornament):
 *   [appColors].
 * - Spacing: [spacing]. Corner radii: [shapes], backed by
 *   `MaterialTheme.shapes`.
 *
 * Typography stays at the Material 3 default, because the type scale is
 * decided per platform rather than shared as tokens.
 */
object AppTheme {
    val colorScheme: ColorScheme
        @Composable @ReadOnlyComposable get() = MaterialTheme.colorScheme

    val appColors: AppColors
        @Composable @ReadOnlyComposable get() = LocalAppColors.current

    val spacing: TokenSpacing
        get() = TokenSpacing

    val shapes: Shapes
        @Composable @ReadOnlyComposable get() = MaterialTheme.shapes
}

/** The colours for one appearance. */
internal data class AppThemeColors(
    val colorScheme: ColorScheme,
    val appColors: AppColors,
)

internal fun appThemeColors(darkTheme: Boolean): AppThemeColors =
    if (darkTheme) {
        AppThemeColors(DarkColorScheme, DarkAppColors)
    } else {
        AppThemeColors(LightColorScheme, LightAppColors)
    }

/** The Material 3 shape scale, from the generated corner radii. */
internal val AppShapes = Shapes(
    extraSmall = RoundedCornerShape(TokenShape.extraSmall),
    small = RoundedCornerShape(TokenShape.small),
    medium = RoundedCornerShape(TokenShape.medium),
    large = RoundedCornerShape(TokenShape.large),
    extraLarge = RoundedCornerShape(TokenShape.extraLarge),
)

private val LocalAppColors = staticCompositionLocalOf<AppColors> {
    error("AppColors not provided — wrap your composable with AppTheme { ... }")
}

/**
 * Applies the brand theme. [darkTheme] follows the system setting by
 * default. Android dynamic colour is not used, so the brand palette applies
 * whatever the wallpaper (ADR 0026).
 */
@Composable
fun AppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colors = appThemeColors(darkTheme)
    CompositionLocalProvider(LocalAppColors provides colors.appColors) {
        MaterialTheme(
            colorScheme = colors.colorScheme,
            shapes = AppShapes,
            content = content,
        )
    }
}
