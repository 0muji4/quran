package com.tilawah.android.features.practice

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tilawah.android.R
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.designsystem.components.BrandCard
import com.tilawah.android.designsystem.components.BrandCardStyle
import com.tilawah.android.designsystem.components.WaveformView

/**
 * State-aware recording panel.
 *
 * READY (idle): a LIGHT card — a leading mic-in-circle badge, "Now you
 * recite" + "Tap the mic to begin", a tan waveform tile, and a teal mic
 * button (no large timer).
 *
 * RECORDING: a DARK card — a header row (mic badge + bold "Recording…" +
 * "Speak clearly" + red dot + elapsed time at top-right), a live coral
 * waveform, and a coral stop button ringed by concentric circles.
 *
 * Mirrors `docs/design/Android _ Practice _ recording.png` and
 * `Android _ Practice _ long surah.png`.
 */
@Composable
fun RecordingPanel(
    state: PracticeState,
    onStart: () -> Unit,
    onStop: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val isRecording = state is PracticeState.Recording
    if (isRecording) {
        RecordingActive(
            meters = (state as PracticeState.Recording).meters,
            durationMs = state.durationMs,
            onStop = onStop,
            modifier = modifier,
        )
    } else {
        RecordingReady(onStart = onStart, modifier = modifier)
    }
}

@Composable
private fun RecordingReady(
    onStart: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing

    BrandCard(modifier = modifier.fillMaxWidth(), style = BrandCardStyle.Paper) {
        Column(verticalArrangement = Arrangement.spacedBy(spacing.lg)) {
            PanelHeader(
                badgeBackground = colors.accent.copy(alpha = 0.18f),
                badgeIconTint = colors.accent,
                title = stringResource(R.string.practice_recording_ready_title),
                subtitle = stringResource(R.string.practice_recording_ready_subtitle),
                titleColor = colors.textPrimary,
                subtitleColor = colors.textSecondary,
            )
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(spacing.cardCornerRadius))
                    .background(colors.tile.copy(alpha = 0.55f))
                    .padding(vertical = spacing.xxxl),
                contentAlignment = Alignment.Center,
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(spacing.xl),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    WaveformView(
                        meters = List(WAVEFORM_PLACEHOLDER_SIZE) { 0f },
                        barColor = colors.textSecondary.copy(alpha = 0.35f),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = spacing.xl),
                    )
                    IconButton(
                        onClick = onStart,
                        modifier = Modifier
                            .size(72.dp)
                            .clip(CircleShape)
                            .background(colors.primary),
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Mic,
                            contentDescription = stringResource(
                                R.string.practice_recording_start_a11y,
                            ),
                            tint = colors.textOnPrimary,
                            modifier = Modifier.size(28.dp),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun RecordingActive(
    meters: List<Float>,
    durationMs: Long,
    onStop: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(spacing.cardCornerRadius))
            .background(colors.cardInverse)
            .padding(spacing.lg),
        verticalArrangement = Arrangement.spacedBy(spacing.xl),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(spacing.md),
        ) {
            PanelHeader(
                badgeBackground = colors.recording.copy(alpha = 0.22f),
                badgeIconTint = colors.recording,
                title = stringResource(R.string.practice_recording_in_progress),
                subtitle = stringResource(R.string.practice_recording_speak_clearly),
                titleColor = colors.textOnInverse,
                subtitleColor = colors.textOnInverse.copy(alpha = 0.7f),
                modifier = Modifier.weight(1f),
            )
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(spacing.xs),
            ) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(colors.recording),
                )
                Text(
                    text = formatDuration(durationMs),
                    style = typography.body.copy(fontWeight = FontWeight.SemiBold),
                    color = colors.textOnInverse,
                )
            }
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(spacing.cardCornerRadius))
                .background(Color.White.copy(alpha = 0.04f))
                .padding(vertical = spacing.xl),
            contentAlignment = Alignment.Center,
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(spacing.xxl),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                WaveformView(
                    meters = meters,
                    barColor = colors.recording,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = spacing.xl),
                )
                Box(contentAlignment = Alignment.Center) {
                    // Concentric rings around the record button.
                    Box(
                        modifier = Modifier
                            .size(108.dp)
                            .clip(CircleShape)
                            .border(1.dp, colors.recording.copy(alpha = 0.25f), CircleShape),
                    )
                    Box(
                        modifier = Modifier
                            .size(90.dp)
                            .clip(CircleShape)
                            .border(1.5.dp, colors.recording.copy(alpha = 0.45f), CircleShape),
                    )
                    IconButton(
                        onClick = onStop,
                        modifier = Modifier
                            .size(72.dp)
                            .clip(CircleShape)
                            .background(colors.recording),
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Stop,
                            contentDescription = stringResource(
                                R.string.practice_recording_stop_a11y,
                            ),
                            tint = colors.textOnPrimary,
                            modifier = Modifier.size(28.dp),
                        )
                    }
                }
            }
        }
    }
}

/**
 * Shared "badge + title + subtitle" header used by both panel states.
 * The badge is a small circle holding a mic glyph.
 */
@Composable
private fun PanelHeader(
    badgeBackground: Color,
    badgeIconTint: Color,
    title: String,
    subtitle: String,
    titleColor: Color,
    subtitleColor: Color,
    modifier: Modifier = Modifier,
) {
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(spacing.md),
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(badgeBackground),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Filled.Mic,
                contentDescription = null,
                tint = badgeIconTint,
                modifier = Modifier.size(18.dp),
            )
        }
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                text = title,
                style = typography.sectionTitle.copy(fontWeight = FontWeight.SemiBold),
                color = titleColor,
            )
            Text(
                text = subtitle,
                style = typography.caption,
                color = subtitleColor,
            )
        }
    }
}

private fun formatDuration(ms: Long): String {
    val totalSeconds = (ms / 1000).coerceAtLeast(0)
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return "%d:%02d".format(minutes, seconds)
}

private const val WAVEFORM_PLACEHOLDER_SIZE = 48
