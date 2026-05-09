package com.quran.android.features.practice

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
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
import com.quran.android.R
import com.quran.android.app.AppError
import com.quran.android.audio.PlayerState
import com.quran.android.designsystem.BrandTheme
import com.quran.android.designsystem.components.BrandCard

/**
 * Teacher reference panel — surfaces the BFF-supplied recitation
 * recording with play / pause + a discrete rate selector. Mirrors
 * `apps/ios/.../Features/Practice/TeacherReferencePanel.swift`.
 *
 * `ReferenceUnavailable` errors render an empty card with a dashed
 * mic icon so the user can still record on their own; other errors
 * fall through to the practice-screen error path.
 */
@Composable
fun TeacherReferencePanel(
    state: TeacherReferenceState,
    onPlay: () -> Unit,
    onPause: () -> Unit,
    onSetRate: (Float) -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing

    BrandCard(modifier = modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(spacing.md)) {
            Text(
                text = stringResource(R.string.practice_reference_eyebrow),
                style = typography.eyebrow,
                color = colors.accent,
            )
            when (state) {
                is TeacherReferenceState.Loading -> Loading()
                is TeacherReferenceState.Ready -> Controls(
                    player = state.player,
                    onPlay = onPlay,
                    onPause = onPause,
                    onSetRate = onSetRate,
                )
                is TeacherReferenceState.Unavailable -> Unavailable(onRetry)
            }
        }
    }
}

sealed interface TeacherReferenceState {
    data object Loading : TeacherReferenceState
    data class Ready(val player: PlayerState) : TeacherReferenceState
    data class Unavailable(val error: AppError.ReferenceUnavailable) : TeacherReferenceState
}

@Composable
private fun Loading() {
    Text(
        text = stringResource(R.string.practice_reference_loading),
        style = BrandTheme.typography.caption,
        color = BrandTheme.colors.textSecondary,
    )
}

@Composable
private fun Controls(
    player: PlayerState,
    onPlay: () -> Unit,
    onPause: () -> Unit,
    onSetRate: (Float) -> Unit,
) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(spacing.md),
    ) {
        IconButton(
            onClick = if (player.isPlaying) onPause else onPlay,
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(colors.primary),
        ) {
            Icon(
                imageVector = if (player.isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                contentDescription = stringResource(
                    if (player.isPlaying) R.string.practice_reference_pause_a11y
                    else R.string.practice_reference_play_a11y,
                ),
                tint = colors.textOnPrimary,
            )
        }
        Text(
            text = formatTime(player.currentMs) + " / " + formatTime(player.durationMs),
            style = typography.caption,
            color = colors.textSecondary,
            modifier = Modifier.weight(1f),
        )
    }
    Row(horizontalArrangement = Arrangement.spacedBy(spacing.sm)) {
        for (rate in listOf(0.5f, 0.75f, 1.0f)) {
            val active = player.rate == rate
            Text(
                text = "${rate}x",
                style = typography.caption.copy(fontWeight = FontWeight.SemiBold),
                color = if (active) colors.textOnPrimary else colors.textPrimary,
                modifier = Modifier
                    .clip(RoundedCornerShape(percent = 50))
                    .background(if (active) colors.primary else colors.tile)
                    .clickable { onSetRate(rate) }
                    .padding(horizontal = spacing.md, vertical = 6.dp),
            )
        }
    }
}

@Composable
private fun Unavailable(onRetry: () -> Unit) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(spacing.sm),
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(colors.tile),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Filled.MicOff,
                contentDescription = null,
                tint = colors.textSecondary,
            )
        }
        Text(
            text = stringResource(R.string.practice_reference_unavailable),
            style = typography.body,
            color = colors.textPrimary,
        )
        Text(
            text = stringResource(R.string.practice_reference_unavailable_hint),
            style = typography.caption,
            color = colors.textSecondary,
        )
        Text(
            text = stringResource(R.string.practice_reference_retry),
            style = typography.caption.copy(fontWeight = FontWeight.SemiBold),
            color = colors.primary,
            modifier = Modifier
                .clickable(onClick = onRetry)
                .padding(spacing.sm),
        )
    }
}

private fun formatTime(ms: Long): String {
    val totalSeconds = (ms / 1000).coerceAtLeast(0)
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return "%d:%02d".format(minutes, seconds)
}
