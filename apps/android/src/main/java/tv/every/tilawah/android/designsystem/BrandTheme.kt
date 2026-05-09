package tv.every.tilawah.android.designsystem

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf

/**
 * App-wide design-token entry point. Wrap the root `@Composable` with
 * [BrandTheme] so feature code can read brand colors / typography /
 * spacing through `BrandTheme.colors`, `BrandTheme.typography`,
 * `BrandTheme.spacing` without threading parameters.
 *
 * Material 3's [MaterialTheme] is also populated so first-party
 * Material components (TopAppBar, NavigationBar, etc.) inherit the
 * brand palette automatically. Feature code should still reach for
 * `BrandTheme.*` over `MaterialTheme.*` for tokens that have a brand
 * equivalent — `MaterialTheme.*` is the fallback for whatever does
 * not map cleanly.
 */
object BrandTheme {
    val colors: BrandColors
        @Composable @ReadOnlyComposable get() = LocalBrandColors.current

    val typography: BrandTypography
        @Composable @ReadOnlyComposable get() = LocalBrandTypography.current

    val spacing: BrandSpacing
        @Composable @ReadOnlyComposable get() = LocalBrandSpacing.current
}

private val LocalBrandColors = staticCompositionLocalOf<BrandColors> {
    error("BrandColors not provided — wrap your composable with BrandTheme { ... }")
}
private val LocalBrandTypography = staticCompositionLocalOf<BrandTypography> {
    error("BrandTypography not provided — wrap your composable with BrandTheme { ... }")
}
private val LocalBrandSpacing = staticCompositionLocalOf<BrandSpacing> {
    error("BrandSpacing not provided — wrap your composable with BrandTheme { ... }")
}

@Composable
fun BrandTheme(
    colors: BrandColors = BrandColorsLight,
    typography: BrandTypography = BrandTypographyDefault,
    spacing: BrandSpacing = BrandSpacingDefault,
    content: @Composable () -> Unit,
) {
    val materialColors = lightColorScheme(
        primary = colors.primary,
        onPrimary = colors.textOnPrimary,
        secondary = colors.accent,
        onSecondary = colors.textOnPrimary,
        tertiary = colors.recording,
        background = colors.surface,
        onBackground = colors.textPrimary,
        surface = colors.card,
        onSurface = colors.textPrimary,
        error = colors.recording,
        onError = colors.textOnPrimary,
    )
    val materialTypography = Typography(
        bodyLarge = typography.body,
        bodyMedium = typography.body,
        titleMedium = typography.sectionTitle,
        titleLarge = typography.pageTitle,
        labelMedium = typography.eyebrow,
        labelSmall = typography.caption,
    )

    CompositionLocalProvider(
        LocalBrandColors provides colors,
        LocalBrandTypography provides typography,
        LocalBrandSpacing provides spacing,
    ) {
        MaterialTheme(
            colorScheme = materialColors,
            typography = materialTypography,
            content = content,
        )
    }
}
