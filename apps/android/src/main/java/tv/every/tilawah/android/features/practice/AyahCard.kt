package tv.every.tilawah.android.features.practice

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import tv.every.tilawah.android.backend.AyahDetail
import tv.every.tilawah.android.designsystem.BrandTheme
import tv.every.tilawah.android.designsystem.components.BrandCard

/**
 * Practice ayah card — shows the Arabic text RTL with the English
 * translation and (optional) transliteration below. Mirrors
 * `apps/ios/.../Features/Practice/AyahCard.swift`.
 */
@Composable
fun AyahCard(
    ayah: AyahDetail,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing

    BrandCard(modifier = modifier.fillMaxWidth()) {
        Column(
            verticalArrangement = Arrangement.spacedBy(spacing.md),
        ) {
            CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                Text(
                    text = ayah.textAr,
                    style = typography.arabicAyah,
                    color = colors.textPrimary,
                    textAlign = TextAlign.End,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            ayah.textEn?.let { english ->
                Text(
                    text = english,
                    style = typography.body,
                    color = colors.textPrimary,
                )
            }
            ayah.transliteration?.let { translit ->
                Text(
                    text = translit,
                    style = typography.caption,
                    color = colors.textSecondary,
                )
            }
        }
    }
}
