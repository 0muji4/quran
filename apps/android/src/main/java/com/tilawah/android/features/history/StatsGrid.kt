package com.tilawah.android.features.history

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tilawah.android.R
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.designsystem.components.BrandCard
import com.tilawah.android.storage.Attempt
import com.tilawah.android.storage.AttemptStatus
import java.time.Duration
import java.time.Instant
import java.time.ZoneId

/**
 * 4-cell grid (This week / Average / Best / Streak) shown above the
 * attempts list on the History tab. Mirrors
 * `apps/ios/.../Features/History/StatsGrid.swift`.
 */
@Composable
fun StatsGrid(
    attempts: List<Attempt>,
    modifier: Modifier = Modifier,
    now: Instant = Instant.now(),
) {
    val stats = computeStats(attempts, now)
    BrandCard(modifier = modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(BrandTheme.spacing.md)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(BrandTheme.spacing.md),
            ) {
                StatCell(
                    title = stringResource(R.string.history_stats_week),
                    value = stats.thisWeekCount.toString(),
                    modifier = Modifier.weight(1f),
                )
                StatCell(
                    title = stringResource(R.string.history_stats_average),
                    value = stats.averagePercent?.let { "%.0f%%".format(it) } ?: "—",
                    modifier = Modifier.weight(1f),
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(BrandTheme.spacing.md),
            ) {
                StatCell(
                    title = stringResource(R.string.history_stats_best),
                    value = stats.bestPercent?.let { "%.0f%%".format(it) } ?: "—",
                    modifier = Modifier.weight(1f),
                )
                StatCell(
                    title = stringResource(R.string.history_stats_streak),
                    value = stats.streakDays.toString(),
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun StatCell(title: String, value: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Text(
            text = title,
            style = BrandTheme.typography.eyebrow,
            color = BrandTheme.colors.textSecondary,
        )
        Text(
            text = value,
            style = BrandTheme.typography.sectionTitle.copy(fontWeight = FontWeight.SemiBold),
            color = BrandTheme.colors.textPrimary,
        )
    }
}

internal data class HistoryStats(
    val thisWeekCount: Int,
    val averagePercent: Double?,
    val bestPercent: Double?,
    val streakDays: Int,
)

internal fun computeStats(attempts: List<Attempt>, now: Instant): HistoryStats {
    if (attempts.isEmpty()) {
        return HistoryStats(0, null, null, 0)
    }
    val zone = ZoneId.systemDefault()
    val sevenDaysAgo = now.minus(Duration.ofDays(7))
    val thisWeek = attempts.count { !it.createdAt.isBefore(sevenDaysAgo) }
    val completed = attempts.filter { it.status == AttemptStatus.COMPLETED && it.score != null }
    val avg = completed.map { it.score!! }.takeIf { it.isNotEmpty() }?.average()?.times(100)
    val best = completed.maxOfOrNull { it.score!! }?.times(100)
    val streak = computeStreak(attempts.map { it.createdAt }, zone, now)
    return HistoryStats(thisWeek, avg, best, streak)
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
