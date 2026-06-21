package com.tilawah.android.features.history

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import com.tilawah.android.R
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.storage.Attempt
import com.tilawah.android.storage.AttemptStatus
import java.time.Duration
import java.time.Instant
import java.time.ZoneId

/**
 * 2x2 grid of four independent rounded tiles (This week / Average /
 * Best / Streak) shown above the attempts list on the History tab.
 *
 * The Figma export renders four separate tiles (not one card with a
 * borderless grid); the AVERAGE tile is the dark inverse variant
 * (`colors.cardInverse` forest-green background, light label, gold
 * value). Each tile carries
 * three lines: eyebrow label / large serif value / subtitle unit.
 * Mirrors `apps/ios/.../Features/History/StatsGrid.swift`.
 */
@Composable
fun StatsGrid(
    attempts: List<Attempt>,
    modifier: Modifier = Modifier,
    now: Instant = Instant.now(),
) {
    val stats = computeStats(attempts, now)
    val spacing = BrandTheme.spacing
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(spacing.md),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(spacing.md),
        ) {
            StatTile(
                title = stringResource(R.string.history_stats_week),
                value = stats.thisWeekCount.toString(),
                unit = stringResource(R.string.history_stats_week_unit),
                modifier = Modifier.weight(1f),
            )
            StatTile(
                title = stringResource(R.string.history_stats_average),
                value = stats.averageValue?.let { "%.0f".format(it) } ?: "—",
                unit = stringResource(R.string.history_stats_average_unit),
                inverse = true,
                modifier = Modifier.weight(1f),
            )
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(spacing.md),
        ) {
            StatTile(
                title = stringResource(R.string.history_stats_best),
                value = stats.bestValue?.let { "%.0f".format(it) } ?: "—",
                unit = stats.bestSurahName ?: stringResource(R.string.history_stats_best_unit_empty),
                modifier = Modifier.weight(1f),
            )
            StatTile(
                title = stringResource(R.string.history_stats_streak),
                value = stats.streakDays.toString(),
                unit = stringResource(R.string.history_stats_streak_unit),
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun StatTile(
    title: String,
    value: String,
    unit: String,
    modifier: Modifier = Modifier,
    inverse: Boolean = false,
) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing

    val background = if (inverse) colors.cardInverse else colors.paper
    // On the inverse tile only the value is gold; the label stays a pale tint.
    val labelColor = if (inverse) colors.textOnInverse.copy(alpha = 0.65f) else colors.textSecondary
    val valueColor = if (inverse) colors.goldOnDark else colors.textPrimary
    val unitColor = if (inverse) colors.textOnInverse else colors.textSecondary

    Column(
        modifier = modifier
            .clip(RoundedCornerShape(spacing.cardCornerRadius))
            .background(background)
            .padding(spacing.lg),
        verticalArrangement = Arrangement.spacedBy(spacing.xs),
    ) {
        Text(
            text = title.uppercase(),
            style = typography.eyebrow,
            color = labelColor,
        )
        Text(
            text = value,
            style = typography.pageTitle,
            color = valueColor,
        )
        Text(
            text = unit,
            style = typography.caption,
            color = unitColor,
            maxLines = 1,
        )
    }
}

internal data class HistoryStats(
    val thisWeekCount: Int,
    /** Mean score on a 0–100 scale (bare number, no percent sign). */
    val averageValue: Double?,
    /** Best score on a 0–100 scale (bare number, no percent sign). */
    val bestValue: Double?,
    /** English surah name of the best-scoring attempt, for the Best tile subtitle. */
    val bestSurahName: String?,
    val streakDays: Int,
)

internal fun computeStats(attempts: List<Attempt>, now: Instant): HistoryStats {
    if (attempts.isEmpty()) {
        return HistoryStats(0, null, null, null, 0)
    }
    val zone = ZoneId.systemDefault()
    val sevenDaysAgo = now.minus(Duration.ofDays(7))
    val thisWeek = attempts.count { !it.createdAt.isBefore(sevenDaysAgo) }
    val completed = attempts.filter { it.status == AttemptStatus.COMPLETED && it.score != null }
    val avg = completed.map { it.score!! }.takeIf { it.isNotEmpty() }?.average()?.times(100)
    val bestAttempt = completed.maxByOrNull { it.score!! }
    val best = bestAttempt?.score?.times(100)
    val bestName = bestAttempt?.surahNameEn
    val streak = computeStreak(attempts.map { it.createdAt }, zone, now)
    return HistoryStats(thisWeek, avg, best, bestName, streak)
}

private fun computeStreak(
    timestamps: List<Instant>,
    zone: ZoneId,
    now: Instant,
): Int {
    if (timestamps.isEmpty()) return 0
    val days = timestamps.map { it.atZone(zone).toLocalDate() }.toSortedSet().reversed()
    var streak = 0
    var cursor = now.atZone(zone).toLocalDate()
    for (day in days) {
        when {
            day == cursor -> {
                streak += 1
                cursor = cursor.minusDays(1)
            }
            day == cursor.plusDays(1) -> {
                cursor = cursor.minusDays(1)
            }
            day < cursor -> break
        }
    }
    return streak
}
