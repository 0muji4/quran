package com.quran.android.features.history

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import com.quran.android.designsystem.BrandTheme
import com.quran.android.storage.Attempt
import com.quran.android.storage.AttemptStatus
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Single attempt row — surah name + ayah number + score percent +
 * timestamp. Mirrors `apps/ios/.../Features/History/AttemptRow.swift`.
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
            .background(colors.card)
            .padding(spacing.lg),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(spacing.md),
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "${attempt.surahNameEn} • ayah ${attempt.ayahNumber}",
                style = typography.body.copy(fontWeight = FontWeight.SemiBold),
                color = colors.textPrimary,
            )
            Text(
                text = formatTimestamp(attempt),
                style = typography.caption,
                color = colors.textSecondary,
            )
        }
        Text(
            text = scoreLabel(attempt),
            style = typography.body.copy(fontWeight = FontWeight.SemiBold),
            color = if (attempt.status == AttemptStatus.COMPLETED) colors.success else colors.recording,
        )
    }
}

private fun scoreLabel(attempt: Attempt): String {
    if (attempt.status == AttemptStatus.FAILED) return "failed"
    val score = attempt.score ?: return "—"
    return "%.0f%%".format(score * 100)
}

private val timestampFormat = DateTimeFormatter
    .ofPattern("yyyy-MM-dd HH:mm", Locale.US)
    .withZone(ZoneId.systemDefault())

private fun formatTimestamp(attempt: Attempt): String =
    timestampFormat.format(attempt.createdAt)
