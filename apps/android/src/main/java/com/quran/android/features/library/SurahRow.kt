package com.quran.android.features.library

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import com.quran.android.backend.SurahSummary
import com.quran.android.designsystem.BrandTheme

/**
 * One row in the Library list. Mirrors `apps/ios/.../Features/Library/SurahRow.swift`:
 * small index circle, English name + revelation place / ayah count
 * metadata, Arabic name on the trailing side rendered RTL.
 */
@Composable
fun SurahRow(
    index: Int,
    surah: SurahSummary,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing

    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(spacing.cardCornerRadius))
            .background(colors.card)
            .clickable(onClick = onClick)
            .semantics {
                role = Role.Button
                contentDescription = "Surah ${surah.nameEn}, ${surah.revelationPlace}, ${surah.ayahCount} ayahs"
            }
            .padding(horizontal = spacing.lg, vertical = spacing.md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(spacing.md),
    ) {
        Box(
            modifier = Modifier
                .size(28.dp)
                .clip(CircleShape)
                .background(colors.tile),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = index.toString(),
                style = typography.caption.copy(fontWeight = FontWeight.SemiBold),
                color = colors.textSecondary,
            )
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = surah.nameEn,
                style = typography.body.copy(fontWeight = FontWeight.SemiBold),
                color = colors.textPrimary,
            )
            Text(
                text = "${surah.revelationPlace} · ${surah.ayahCount} ayahs",
                style = typography.caption,
                color = colors.textSecondary,
            )
        }
        CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
            Text(
                text = surah.nameAr,
                style = typography.arabicAyah,
                color = colors.textPrimary,
            )
        }
    }
}
