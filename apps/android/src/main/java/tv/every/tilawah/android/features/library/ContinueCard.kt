package tv.every.tilawah.android.features.library

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import tv.every.tilawah.android.R
import tv.every.tilawah.android.designsystem.BrandTheme
import tv.every.tilawah.android.storage.LastPracticed

/**
 * Inverse-themed card that resumes the user's last practice session.
 * Mirrors `apps/ios/.../Features/Library/ContinueCard.swift`. The
 * eyebrow + body sit on `BrandTheme.colors.cardInverse` so the card
 * pops against the cream surface.
 */
@Composable
fun ContinueCard(
    entry: LastPracticed,
    onResume: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(spacing.cardCornerRadius))
            .background(colors.cardInverse)
            .clickable(onClick = onResume)
            .semantics {
                role = Role.Button
                contentDescription = "Resume ${entry.surahNameEn} ayah ${entry.ayahNumber}"
            }
            .padding(spacing.lg),
        verticalArrangement = Arrangement.spacedBy(spacing.xs),
    ) {
        Text(
            text = stringResource(R.string.continue_eyebrow),
            style = typography.eyebrow,
            color = colors.accent,
        )
        Text(
            text = stringResource(
                R.string.continue_title,
                entry.surahNameEn,
                entry.ayahNumber,
            ),
            style = typography.sectionTitle.copy(fontWeight = FontWeight.SemiBold),
            color = colors.textOnInverse,
        )
        Text(
            text = stringResource(R.string.continue_subtitle, entry.ayahCount),
            style = typography.caption,
            color = colors.textOnInverse.copy(alpha = 0.75f),
        )
    }
}
