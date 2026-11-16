package com.tilawah.android.features.library

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.tilawah.android.R
import com.tilawah.android.designsystem.AppTheme
import com.tilawah.android.designsystem.components.AppCard
import com.tilawah.android.storage.LastPracticed
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.Locale

/**
 * The card at the top of the Library that resumes the last session: the
 * surah in English and Arabic, how far into it the user got and when, and a
 * button to resume at that ayah.
 */
@Composable
fun ContinueCard(
    entry: LastPracticed,
    onResume: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val progress = if (entry.ayahCount > 0) entry.ayahNumber.toFloat() / entry.ayahCount else 0f
    AppCard(modifier = modifier.fillMaxWidth()) {
        Eyebrow(icon = Icons.Filled.Bookmark, label = stringResource(R.string.continue_eyebrow))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space2),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = entry.surahNameEn,
                modifier = Modifier.weight(1f),
                style = AppTheme.typography.titleLarge,
            )
            SurahNameArabic(name = entry.surahNameAr)
        }
        Text(
            text = stringResource(
                R.string.continue_subtitle,
                entry.ayahNumber,
                entry.ayahCount,
                relativeLastPracticed(entry.practicedAt),
            ),
            style = AppTheme.typography.bodyMedium,
            color = AppTheme.colorScheme.onSurfaceVariant,
        )
        LinearProgressIndicator(
            progress = { progress.coerceIn(0f, 1f) },
            modifier = Modifier.fillMaxWidth().padding(vertical = AppTheme.spacing.space1),
        )
        CardAction(label = stringResource(R.string.continue_resume, entry.ayahNumber), onClick = onResume)
    }
}

/**
 * The same card for a user with no session yet: an invitation to start, with
 * a button that opens the first surah at ayah 1.
 */
@Composable
fun GetStartedCard(
    onStart: () -> Unit,
    modifier: Modifier = Modifier,
) {
    AppCard(modifier = modifier.fillMaxWidth()) {
        Eyebrow(icon = Icons.Filled.Star, label = stringResource(R.string.continue_get_started_eyebrow))
        Text(text = stringResource(R.string.continue_empty_title), style = AppTheme.typography.titleLarge)
        Text(
            text = stringResource(R.string.continue_empty_description),
            style = AppTheme.typography.bodyMedium,
            color = AppTheme.colorScheme.onSurfaceVariant,
        )
        CardAction(label = stringResource(R.string.continue_empty_cta), onClick = onStart)
    }
}

@Composable
private fun Eyebrow(icon: ImageVector, label: String) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space1),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(16.dp),
            tint = AppTheme.colorScheme.primary,
        )
        Text(text = label, style = AppTheme.typography.labelLarge, color = AppTheme.colorScheme.primary)
    }
}

/** A filled button with a forward arrow, at the card's end. */
@Composable
private fun CardAction(label: String, onClick: () -> Unit) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
        Button(onClick = onClick, contentPadding = ButtonDefaults.ButtonWithIconContentPadding) {
            Text(text = label)
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                contentDescription = null,
                modifier = Modifier.padding(start = ButtonDefaults.IconSpacing).size(ButtonDefaults.IconSize),
            )
        }
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
