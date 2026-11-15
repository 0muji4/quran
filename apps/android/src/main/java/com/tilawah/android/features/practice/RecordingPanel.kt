package com.tilawah.android.features.practice

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.tilawah.android.R
import com.tilawah.android.designsystem.AppTheme
import com.tilawah.android.designsystem.components.AppRecordButton
import com.tilawah.android.designsystem.components.AppWaveform

/**
 * The record button and what goes with it. Before recording: a prompt above
 * and a hint below. While recording: the elapsed time beside a recording
 * dot, the live waveform, and the button as a stop button.
 */
@Composable
fun RecordingPanel(
    state: PracticeState,
    onStart: () -> Unit,
    onStop: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val typography = AppTheme.typography
    val onSurfaceVariant = AppTheme.colorScheme.onSurfaceVariant
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space3),
    ) {
        if (state is PracticeState.Recording) {
            RecordingStatus(durationMs = state.durationMs)
            AppWaveform(levels = state.meters.takeLast(WAVEFORM_BARS))
            AppRecordButton(
                recording = true,
                onClick = onStop,
                contentDescription = stringResource(R.string.practice_recording_stop_a11y),
            )
            Text(
                text = stringResource(R.string.practice_recording_speak_clearly),
                style = typography.bodySmall,
                color = onSurfaceVariant,
            )
        } else {
            Text(
                text = stringResource(R.string.practice_recording_ready_title),
                style = typography.bodyLarge,
                color = onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
            AppRecordButton(
                recording = false,
                onClick = onStart,
                contentDescription = stringResource(R.string.practice_recording_start_a11y),
            )
            Text(
                text = stringResource(R.string.practice_recording_ready_hint),
                style = typography.bodySmall,
                color = onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
        }
    }
}

/** "Recording…" and the elapsed time in the recording colour, after a recording dot. */
@Composable
private fun RecordingStatus(durationMs: Long) {
    val recording = AppTheme.appColors.recording
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space2),
    ) {
        Box(modifier = Modifier.size(8.dp).background(recording, CircleShape))
        Text(
            text = stringResource(R.string.practice_recording_in_progress),
            style = AppTheme.typography.labelLarge,
            color = recording,
        )
        Text(
            text = formatDuration(durationMs),
            style = AppTheme.typography.labelLarge,
            color = recording,
        )
    }
}

private fun formatDuration(ms: Long): String {
    val totalSeconds = (ms / 1000).coerceAtLeast(0)
    return "%d:%02d".format(totalSeconds / 60, totalSeconds % 60)
}

/** The most recent levels the waveform shows, oldest first. */
private const val WAVEFORM_BARS = 28
