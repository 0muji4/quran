package com.tilawah.android.features.library

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
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
import com.tilawah.android.backend.SurahSummary
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.designsystem.components.BrandCard
import com.tilawah.android.designsystem.components.BrandCardStyle

/**
 * One row in the Library list. Mirrors `apps/ios/.../Features/Library/SurahRow.swift`:
 * leading cream badge with the *canonical* surah number, English name +
 * revelation place / ayah count (+ optional best score) metadata, and the
 * Arabic name on the trailing side rendered RTL.
 *
 * The [selected] row (the resume target shown first) gains a gold hairline
 * border to echo the Figma "active" treatment.
 *
 * @param canonicalNumber the surah's canonical 1–114 number for the badge,
 *   derived from `surah.id` by the caller (falls back to list position).
 * @param bestScore best recorded score on a 0–100 scale, or null when the
 *   user has not practiced this surah yet (then the "best" suffix is hidden).
 */
@Composable
fun SurahRow(
    canonicalNumber: Int,
    surah: SurahSummary,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    selected: Boolean = false,
    bestScore: Int? = null,
) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing

    val meta = buildString {
        append(surah.revelationPlace)
        append(" · ")
        append(surah.ayahCount)
        append(" ayahs")
        if (bestScore != null) {
            append(" · best ")
            append(bestScore)
        }
    }

    BrandCard(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .semantics {
                role = Role.Button
                contentDescription =
                    "Surah ${surah.nameEn}, ${surah.revelationPlace}, ${surah.ayahCount} ayahs"
            },
        style = BrandCardStyle.Paper,
        border = if (selected) BorderStroke(1.dp, colors.borderStrong) else null,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(spacing.md),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(colors.tile),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = canonicalNumber.toString(),
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
                    text = meta,
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
}
