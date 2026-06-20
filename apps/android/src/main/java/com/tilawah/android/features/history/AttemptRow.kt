package com.tilawah.android.features.history

import androidx.compose.foundation.background
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.storage.Attempt
import com.tilawah.android.storage.AttemptStatus
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Single attempt row — leading circular tan ayah badge + surah name +
 * relative timestamp + serif score with a smaller "/100" suffix.
 * Mirrors `apps/ios/.../Features/History/AttemptRow.swift`.
 *
 * Score colour is teal/success for passing attempts and amber (accent)
 * when the score falls below [LOW_SCORE_THRESHOLD], matching the Figma
 * "needs work" highlight.
 */
@Composable
fun AttemptRow(
    attempt: Attempt,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing

    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(spacing.cardCornerRadius))
            .background(colors.paper)
            .padding(spacing.lg),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(spacing.md),
    ) {
        AyahBadge(ayahNumber = attempt.ayahNumber)
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = buildAnnotatedString {
                    withStyle(SpanStyle(fontWeight = FontWeight.SemiBold, color = colors.textPrimary)) {
                        append(attempt.surahNameEn)
                    }
                    withStyle(SpanStyle(color = colors.textSecondary)) {
                        append("  ·  ayah ${attempt.ayahNumber}")
                    }
                },
                style = typography.body,
            )
            Text(
                text = formatTimestamp(attempt.createdAt),
                style = typography.caption,
                color = colors.textSecondary,
            )
        }
        ScoreLabel(attempt = attempt)
    }
}

@Composable
private fun AyahBadge(ayahNumber: Int, modifier: Modifier = Modifier) {
    val colors = BrandTheme.colors
    Box(
        modifier = modifier
            .size(36.dp)
            .clip(CircleShape)
            .background(colors.tile),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = ayahNumber.toString(),
            style = BrandTheme.typography.caption,
            color = colors.goldOnLight,
        )
    }
}

@Composable
private fun ScoreLabel(attempt: Attempt) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography

    if (attempt.status == AttemptStatus.FAILED || attempt.score == null) {
        Text(
            text = if (attempt.status == AttemptStatus.FAILED) "failed" else "—",
            style = typography.body.copy(fontWeight = FontWeight.SemiBold),
            color = colors.textSecondary,
        )
        return
    }

    val scoreValue = attempt.score * 100
    val color = if (scoreValue < LOW_SCORE_THRESHOLD) colors.accent else colors.primary
    Text(
        text = buildAnnotatedString {
            withStyle(typography.sectionTitle.toSpanStyle().copy(color = color)) {
                append("%.0f".format(scoreValue))
            }
            withStyle(SpanStyle(color = colors.textSecondary, fontSize = 12.sp)) {
                append(" /100")
            }
        },
        style = typography.scoreDisplay.copy(fontSize = 24.sp),
    )
}

private const val LOW_SCORE_THRESHOLD = 80.0

private val timeFormat = DateTimeFormatter
    .ofPattern("HH:mm", Locale.US)
    .withZone(ZoneId.systemDefault())

private val monthDayFormat = DateTimeFormatter
    .ofPattern("MMM d", Locale.US)
    .withZone(ZoneId.systemDefault())

/**
 * Relative timestamp: "Today · HH:mm" for same-day attempts,
 * "Yesterday" for the prior day, and "MMM d" for anything older.
 */
private fun formatTimestamp(
    createdAt: Instant,
    now: Instant = Instant.now(),
    zone: ZoneId = ZoneId.systemDefault(),
): String {
    val day = createdAt.atZone(zone).toLocalDate()
    val today = now.atZone(zone).toLocalDate()
    return when (day) {
        today -> "Today · ${timeFormat.format(createdAt)}"
        today.minusDays(1) -> "Yesterday"
        else -> monthDayFormat.format(createdAt)
    }
}
