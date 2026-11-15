package com.tilawah.android.features.result

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import com.tilawah.android.R
import com.tilawah.android.audio.PlayerState
import com.tilawah.android.designsystem.AppTheme
import com.tilawah.android.designsystem.components.AppPanel
import com.tilawah.android.designsystem.components.AppTonalIconButton

/**
 * The teacher recitation and the user's own recording, each with a play
 * button and its length. Each row has its own [PlaybackEntry], so the
 * ViewModel runs two players without exposing which one is active.
 */
@Composable
fun ListenBackSection(
    teacher: PlaybackEntry?,
    you: PlaybackEntry?,
    modifier: Modifier = Modifier,
) {
    if (teacher == null && you == null) return
    AppPanel(modifier = modifier.fillMaxWidth()) {
        Text(text = stringResource(R.string.result_listen_back_title), style = AppTheme.typography.titleMedium)
        teacher?.let { ListenBackRow(label = stringResource(R.string.result_listen_back_teacher), entry = it) }
        you?.let { ListenBackRow(label = stringResource(R.string.result_listen_back_you), entry = it) }
    }
}

@Composable
private fun ListenBackRow(label: String, entry: PlaybackEntry) {
    val isPlaying = entry.state.isPlaying
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space3),
    ) {
        AppTonalIconButton(
            icon = if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
            contentDescription = stringResource(
                if (isPlaying) R.string.result_listen_back_pause_a11y else R.string.result_listen_back_play_a11y,
                label,
            ),
            onClick = if (isPlaying) entry.onPause else entry.onPlay,
        )
        Text(text = label, modifier = Modifier.weight(1f), style = AppTheme.typography.bodyLarge)
        Text(
            text = formatDuration(entry.state.durationMs),
            style = AppTheme.typography.bodySmall,
            color = AppTheme.colorScheme.onSurfaceVariant,
        )
    }
}

private fun formatDuration(ms: Long): String {
    val totalSeconds = (ms / 1000).coerceAtLeast(0)
    return "%d:%02d".format(totalSeconds / 60, totalSeconds % 60)
}

/** One listen-back row's player state and controls. */
data class PlaybackEntry(
    val state: PlayerState,
    val onPlay: () -> Unit,
    val onPause: () -> Unit,
)
