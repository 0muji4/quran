package com.tilawah.android.features.history

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.ListItem
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.tilawah.android.R
import com.tilawah.android.designsystem.AppTheme
import com.tilawah.android.designsystem.components.AppVerdictChip
import com.tilawah.android.features.result.appVerdict
import com.tilawah.android.features.result.verdictBandForScore
import com.tilawah.android.storage.Attempt
import com.tilawah.android.storage.AttemptStatus
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * One attempt in the History list, as a Material 3 list item: the surah's
 * number, the surah and ayah, when it was recorded, and the score.
 *
 * The score is a verdict chip in the Result screen's bands and colours
 * (`verdictBandForScore`), so a score reads the same on both screens. An
 * attempt still being scored shows a dash; one whose scoring failed says so.
 */
@Composable
fun AttemptRow(
    attempt: Attempt,
    modifier: Modifier = Modifier,
    now: Instant = Instant.now(),
) {
    ListItem(
        modifier = modifier,
        leadingContent = {
            Surface(
                modifier = Modifier.size(40.dp),
                shape = CircleShape,
                color = AppTheme.colorScheme.secondaryContainer,
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = attempt.surahId.toIntOrNull()?.let { "%d".format(it) } ?: attempt.surahId,
                        style = AppTheme.typography.labelLarge,
                    )
                }
            }
        },
        headlineContent = {
            Text(text = stringResource(R.string.history_attempt_title, attempt.surahNameEn, attempt.ayahNumber))
        },
        supportingContent = { Text(text = relativeTime(attempt.createdAt, now)) },
        trailingContent = { AttemptScore(attempt) },
    )
}

@Composable
private fun AttemptScore(attempt: Attempt) {
    val score = attempt.score
    val verdict = verdictBandForScore(score).appVerdict
    when {
        attempt.status == AttemptStatus.FAILED -> Text(
            text = stringResource(R.string.history_attempt_failed),
            style = AppTheme.typography.labelLarge,
            color = AppTheme.colorScheme.onSurfaceVariant,
        )
        score == null || verdict == null -> {
            val notScored = stringResource(R.string.history_not_scored)
            Text(
                text = "—",
                modifier = Modifier.semantics { contentDescription = notScored },
                style = AppTheme.typography.labelLarge,
                color = AppTheme.colorScheme.onSurfaceVariant,
            )
        }
        else -> AppVerdictChip(verdict = verdict, label = "%d".format(score))
    }
}

/**
 * When an attempt was recorded: "Today · 14:02" on the same day, "Yesterday"
 * the day before, and the month and day before that.
 */
@Composable
internal fun relativeTime(
    createdAt: Instant,
    now: Instant,
    zone: ZoneId = ZoneId.systemDefault(),
): String {
    val day = createdAt.atZone(zone).toLocalDate()
    val today = now.atZone(zone).toLocalDate()
    return when (day) {
        today -> stringResource(R.string.history_relative_today, timeFormat.withZone(zone).format(createdAt))
        today.minusDays(1) -> stringResource(R.string.history_relative_yesterday)
        else -> monthDayFormat.withZone(zone).format(createdAt)
    }
}

private val timeFormat = DateTimeFormatter.ofPattern("HH:mm", Locale.US)
private val monthDayFormat = DateTimeFormatter.ofPattern("MMM d", Locale.US)
