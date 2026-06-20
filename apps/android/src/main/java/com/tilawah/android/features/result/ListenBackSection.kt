package com.tilawah.android.features.result

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tilawah.android.R
import com.tilawah.android.audio.PlayerState
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.designsystem.components.BrandCard

/**
 * Two-row playback section: teacher reference + the user's own recording.
 * Mirrors `docs/design/Android _ Result detail`.
 *
 * Rows show a short label ("Teacher" / "You") and a single trailing clip
 * duration. The shared `PlaybackRow` renders an "elapsed / total" pair, so
 * the listen-back layout is built locally here to surface just the
 * duration; if other screens need the same single-duration variant,
 * promote this row into `PlaybackRow` with a format flag.
 *
 * Each row is fed by a separate [PlayerState] / start / pause pair so the
 * parent VM can manage two `Player`s without exposing an "active row"
 * surface to the View.
 */
@Composable
fun ListenBackSection(
    teacher: PlaybackEntry?,
    you: PlaybackEntry?,
    modifier: Modifier = Modifier,
) {
    if (teacher == null && you == null) return
    val colors = BrandTheme.colors
    BrandCard(modifier = modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(BrandTheme.spacing.md)) {
            Text(
                text = stringResource(R.string.result_listen_back_title),
                style = BrandTheme.typography.sectionTitle.copy(fontWeight = FontWeight.SemiBold),
                color = colors.textPrimary,
            )
            teacher?.let {
                ListenBackRow(
                    label = stringResource(R.string.result_listen_back_teacher),
                    entry = it,
                    accent = colors.primary,
                )
            }
            you?.let {
                ListenBackRow(
                    label = stringResource(R.string.result_listen_back_you),
                    entry = it,
                    accent = colors.accent,
                )
            }
        }
    }
}

@Composable
private fun ListenBackRow(
    label: String,
    entry: PlaybackEntry,
    accent: Color,
) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing
    val isPlaying = entry.state.isPlaying

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(spacing.cardCornerRadius))
            .background(colors.tile)
            .padding(spacing.md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(spacing.md),
    ) {
        IconButton(
            onClick = if (isPlaying) entry.onPause else entry.onPlay,
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(accent),
        ) {
            Icon(
                imageVector = if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                contentDescription = if (isPlaying) "Pause $label" else "Play $label",
                tint = colors.textOnPrimary,
            )
        }
        Text(
            text = label,
            style = typography.body.copy(fontWeight = FontWeight.SemiBold),
            color = colors.textPrimary,
            modifier = Modifier.weight(1f),
        )
        Text(
            text = formatDuration(entry.state.durationMs),
            style = typography.caption,
            color = colors.textSecondary,
        )
    }
}

private fun formatDuration(ms: Long): String {
    val totalSeconds = (ms / 1000).coerceAtLeast(0)
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return "%d:%02d".format(minutes, seconds)
}

data class PlaybackEntry(
    val state: PlayerState,
    val onPlay: () -> Unit,
    val onPause: () -> Unit,
)
