package com.tilawah.android.features.library

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import com.tilawah.android.R
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.designsystem.components.PrimaryButton
import com.tilawah.android.designsystem.components.PrimaryButtonTint
import com.tilawah.android.storage.LastPracticed
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.Locale

/**
 * Dark "Continue your practice" card that resumes the user's last session.
 * Mirrors `apps/ios/.../Features/Library/ContinueCard.swift`. Sits on
 * [BrandTheme.colors.cardInverse] (deep forest green) so it pops against
 * the cream surface; the eyebrow
 * is a small outlined pill, the title pairs the Arabic name with its Latin
 * transliteration, and an amber progress bar previews how far the surah is.
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

    val progress = if (entry.ayahCount > 0) {
        entry.ayahNumber.toFloat() / entry.ayahCount.toFloat()
    } else {
        0f
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(spacing.cardCornerRadius))
            .background(colors.cardInverse)
            .padding(spacing.lg),
        verticalArrangement = Arrangement.spacedBy(spacing.md),
    ) {
        ContinueEyebrow(label = stringResource(R.string.continue_eyebrow))

        Text(
            text = buildAnnotatedString {
                append(entry.surahNameAr)
                append("  ")
                withStyle(SpanStyle(color = colors.textOnInverse.copy(alpha = 0.85f))) {
                    append(entry.surahNameEn)
                }
            },
            style = typography.sectionTitle.copy(fontWeight = FontWeight.SemiBold),
            color = colors.textOnInverse,
        )

        Text(
            text = stringResource(
                R.string.continue_subtitle,
                entry.ayahNumber,
                entry.ayahCount,
                relativeLastPracticed(entry.practicedAt),
            ),
            style = typography.caption,
            color = colors.textOnInverse.copy(alpha = 0.75f),
        )

        ContinueProgressBar(fraction = progress)

        PrimaryButton(
            label = stringResource(R.string.continue_resume, entry.ayahNumber),
            onClick = onResume,
            tint = PrimaryButtonTint.Accent,
            trailingIcon = Icons.AutoMirrored.Filled.ArrowForward,
            modifier = Modifier.semantics {
                role = Role.Button
                contentDescription = "Resume ${entry.surahNameEn} ayah ${entry.ayahNumber}"
            },
        )
    }
}

/**
 * Get-started variant of the Continue hero, shown when the user has no
 * recorded session yet. Reuses the dark card shell and gold eyebrow so the
 * Library always leads with this hero (resume once there is history),
 * mirroring the web `ContinueCard.tsx` empty state — the surface the user
 * pointed to as the reference. The CTA opens the first surah at ayah 1 via
 * [onStart], matching web's `/practice/{firstSurah}/1`.
 */
@Composable
fun GetStartedCard(
    onStart: () -> Unit,
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
            .padding(spacing.lg),
        verticalArrangement = Arrangement.spacedBy(spacing.md),
    ) {
        ContinueEyebrow(label = stringResource(R.string.continue_get_started_eyebrow))

        Text(
            text = stringResource(R.string.continue_empty_title),
            style = typography.sectionTitle.copy(fontWeight = FontWeight.SemiBold),
            color = colors.textOnInverse,
        )

        Text(
            text = stringResource(R.string.continue_empty_description),
            style = typography.caption,
            color = colors.textOnInverse.copy(alpha = 0.75f),
        )

        PrimaryButton(
            label = stringResource(R.string.continue_empty_cta),
            onClick = onStart,
            tint = PrimaryButtonTint.Accent,
            trailingIcon = Icons.AutoMirrored.Filled.ArrowForward,
        )
    }
}

@Composable
private fun ContinueEyebrow(label: String) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(percent = 50))
            .border(1.dp, colors.goldOnDark.copy(alpha = 0.5f), RoundedCornerShape(percent = 50))
            .padding(horizontal = spacing.sm, vertical = spacing.xs),
        horizontalArrangement = Arrangement.spacedBy(spacing.xs),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = Icons.Filled.Bookmark,
            contentDescription = null,
            tint = colors.goldOnDark,
            modifier = Modifier.size(14.dp),
        )
        Text(
            text = label,
            style = typography.eyebrow,
            color = colors.goldOnDark,
        )
    }
}

/**
 * Thin amber track previewing the resume position within the surah. A
 * local component (rather than the shared [com.tilawah.android.designsystem.components.BrandProgressBar])
 * because the Continue card wants a label-less bar on the dark surface.
 */
@Composable
private fun ContinueProgressBar(fraction: Float) {
    val colors = BrandTheme.colors
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(4.dp)
            .clip(RoundedCornerShape(percent = 50))
            .background(colors.textOnInverse.copy(alpha = 0.2f)),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth(fraction.coerceIn(0f, 1f))
                .height(4.dp)
                .clip(RoundedCornerShape(percent = 50))
                .background(colors.accent),
        )
    }
}

/**
 * Human-friendly "last practiced" label derived from [practicedAt]:
 * `today` / `yesterday` for the two most recent calendar days, otherwise a
 * short `MMM d` date. Computed against the device's local time zone so the
 * day boundary matches the user's perception.
 */
internal fun relativeLastPracticed(
    practicedAt: Instant,
    now: Instant = Instant.now(),
    zone: ZoneId = ZoneId.systemDefault(),
): String {
    val practicedDay = practicedAt.atZone(zone).toLocalDate()
    val today = now.atZone(zone).toLocalDate()
    return when (ChronoUnit.DAYS.between(practicedDay, today)) {
        0L -> "today"
        1L -> "yesterday"
        else -> practicedDay.format(DateTimeFormatter.ofPattern("MMM d", Locale.US))
    }
}
