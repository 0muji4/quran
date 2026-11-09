package com.tilawah.android.designsystem

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.sp
import com.tilawah.android.R
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
 * - Type: [typography], the Material 3 type scale at its default values,
 *   backed by `MaterialTheme.typography`. Quran text, which Material 3 has
 *   no role for: [quranTypography] (ADR 0028).
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

    val typography: Typography
        @Composable @ReadOnlyComposable get() = MaterialTheme.typography

    val quranTypography: QuranTypography
        get() = AppQuranTypography
}

/** Quran text styles, in the bundled Amiri subset. Sizes are `sp`, so they follow the font scale. */
data class QuranTypography(
    val ayah: TextStyle,
    /** An ayah too long for [ayah], such as 2:255. */
    val ayahLong: TextStyle,
    val ayahNumber: TextStyle,
)

private val AmiriQuran = FontFamily(Font(R.font.tilawah_amiri_quran_regular))

internal val AppQuranTypography = QuranTypography(
    ayah = TextStyle(fontFamily = AmiriQuran, fontSize = 34.sp),
    ayahLong = TextStyle(fontFamily = AmiriQuran, fontSize = 28.sp),
    ayahNumber = TextStyle(fontFamily = AmiriQuran, fontSize = 20.sp),
)

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
