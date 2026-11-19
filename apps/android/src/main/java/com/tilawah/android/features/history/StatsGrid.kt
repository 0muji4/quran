package com.tilawah.android.features.history

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import com.tilawah.android.R
import com.tilawah.android.designsystem.AppTheme
import com.tilawah.android.storage.Attempt
import com.tilawah.android.storage.AttemptStatus
import java.time.Duration
import java.time.Instant
import java.time.ZoneId

/**
 * The four totals above the History list: this week's attempts, the average
 * score, the best score with its surah, and the day streak. Each is a filled
 * Material 3 card; the average is the emphasised one, in the secondary
 * container colour. The totals always cover every attempt, whatever the
 * list's filter.
 */
@Composable
fun StatsGrid(
    attempts: List<Attempt>,
    modifier: Modifier = Modifier,
    now: Instant = Instant.now(),
) {
    val stats = computeStats(attempts, now)
    val gap = AppTheme.spacing.space2
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(gap)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(gap)) {
            StatTile(
                title = stringResource(R.string.history_stats_week),
                value = "%d".format(stats.thisWeekCount),
                unit = stringResource(R.string.history_stats_week_unit),
                modifier = Modifier.weight(1f),
            )
            StatTile(
                title = stringResource(R.string.history_stats_average),
                value = stats.averageValue?.let { "%.0f".format(it) } ?: "—",
                unit = stringResource(R.string.history_stats_average_unit),
                emphasis = true,
                modifier = Modifier.weight(1f),
            )
        }
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(gap)) {
            StatTile(
                title = stringResource(R.string.history_stats_best),
                value = stats.bestValue?.let { "%d".format(it) } ?: "—",
                unit = stats.bestSurahName ?: stringResource(R.string.history_stats_best_unit_empty),
                modifier = Modifier.weight(1f),
            )
            StatTile(
                title = stringResource(R.string.history_stats_streak),
                value = "%d".format(stats.streakDays),
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
    emphasis: Boolean = false,
) {
    val colors = AppTheme.colorScheme
    Card(
        modifier = modifier.semantics(mergeDescendants = true) {},
        colors = if (emphasis) {
            CardDefaults.cardColors(
                containerColor = colors.secondaryContainer,
                contentColor = colors.onSecondaryContainer,
            )
        } else {
            CardDefaults.cardColors(containerColor = colors.surfaceContainerHighest)
        },
    ) {
        val secondary = if (emphasis) colors.onSecondaryContainer else colors.onSurfaceVariant
        Column(modifier = Modifier.fillMaxWidth().padding(AppTheme.spacing.space4)) {
            Text(text = title, style = AppTheme.typography.labelMedium, color = secondary)
            Text(text = value, style = AppTheme.typography.headlineLarge)
            Text(
                text = unit,
                style = AppTheme.typography.bodySmall,
                color = secondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

internal data class HistoryStats(
    val thisWeekCount: Int,
    /** Mean score on a 0–100 scale (bare number, no percent sign). */
    val averageValue: Double?,
    /** Best score on a 0–100 scale (bare number, no percent sign). */
    val bestValue: Int?,
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
    val avg = completed.map { it.score!! }.takeIf { it.isNotEmpty() }?.average()
    val bestAttempt = completed.maxByOrNull { it.score!! }
    val best = bestAttempt?.score
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
    // Not toSortedSet().reversed(): that binds to the JDK 21 member, which
    // is missing below API 35 and crashes there.
    val days = timestamps.map { it.atZone(zone).toLocalDate() }.distinct().sortedDescending()
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
