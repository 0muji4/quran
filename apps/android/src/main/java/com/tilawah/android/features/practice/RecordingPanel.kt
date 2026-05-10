package com.tilawah.android.features.practice

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tilawah.android.R
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.designsystem.components.WaveformView

/**
 * Inverse-themed recording panel. Mirrors
 * `apps/ios/.../Features/Practice/RecordingPanel.swift` — a dark card
 * with a large coral record button, live waveform, and elapsed time
 * label.
 */
@Composable
fun RecordingPanel(
    state: PracticeState,
    onStart: () -> Unit,
    onStop: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing

    val isRecording = state is PracticeState.Recording
    val meters = (state as? PracticeState.Recording)?.meters ?: List(WAVEFORM_PLACEHOLDER_SIZE) { 0f }
    val durationMs = (state as? PracticeState.Recording)?.durationMs ?: 0L

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(spacing.cardCornerRadius))
            .background(colors.cardInverse)
            .padding(spacing.lg),
        verticalArrangement = Arrangement.spacedBy(spacing.md),
    ) {
        Text(
            text = stringResource(R.string.practice_recording_eyebrow),
            style = typography.eyebrow,
            color = colors.accent,
        )
        WaveformView(
            meters = meters,
            barColor = if (isRecording) colors.recording else colors.textOnInverse.copy(alpha = 0.4f),
            modifier = Modifier.fillMaxWidth(),
        )
        Text(
            text = formatDuration(durationMs),
            style = typography.scoreDisplay.copy(fontWeight = FontWeight.Normal),
            color = colors.textOnInverse,
        )
        Box(
            modifier = Modifier.fillMaxWidth(),
            contentAlignment = Alignment.Center,
        ) {
            IconButton(
                onClick = if (isRecording) onStop else onStart,
                modifier = Modifier
                    .size(72.dp)
                    .clip(CircleShape)
                    .background(colors.recording),
            ) {
                Icon(
                    imageVector = if (isRecording) Icons.Filled.Stop else Icons.Filled.Mic,
                    contentDescription = stringResource(
                        if (isRecording) R.string.practice_recording_stop_a11y
                        else R.string.practice_recording_start_a11y,
                    ),
                    tint = colors.textOnPrimary,
                )
            }
        }
        Text(
            text = stringResource(
                if (isRecording) R.string.practice_recording_in_progress
                else R.string.practice_recording_ready_hint,
            ),
            style = typography.caption,
            color = colors.textOnInverse.copy(alpha = 0.75f),
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

private fun formatDuration(ms: Long): String {
    val totalSeconds = (ms / 1000).coerceAtLeast(0)
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return "%d:%02d".format(minutes, seconds)
}

private const val WAVEFORM_PLACEHOLDER_SIZE = 64
