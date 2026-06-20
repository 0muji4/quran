package com.tilawah.android.features.practice

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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.VolumeUp
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
import com.tilawah.android.R
import com.tilawah.android.app.AppError
import com.tilawah.android.audio.PlayerState
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.designsystem.components.BrandCard

/**
 * Teacher reference panel — a single compact row: a teal circular
 * play/pause button, a two-line block (bold "Teacher reference" title +
 * a meta line "<reciter> · <duration> · <rate>×"), and a trailing
 * speaker glyph. Mirrors the Figma exports `docs/design/Android _ Practice *`.
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
    BrandCard(modifier = modifier.fillMaxWidth()) {
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
    @Suppress("UNUSED_PARAMETER") onSetRate: (Float) -> Unit,
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
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text(
                text = stringResource(R.string.practice_reference_title),
                style = typography.body.copy(fontWeight = FontWeight.SemiBold),
                color = colors.textPrimary,
            )
            Text(
                text = stringResource(
                    R.string.practice_reference_meta,
                    // TODO: reciter is hard-coded until the BFF returns
                    // recitation metadata (reciter + style) per ayah.
                    RECITER_NAME,
                    formatTime(player.durationMs),
                    "%.2f".format(player.rate),
                ),
                style = typography.caption,
                color = colors.textSecondary,
            )
        }
        Icon(
            imageVector = Icons.AutoMirrored.Filled.VolumeUp,
            contentDescription = null,
            tint = colors.textSecondary,
            modifier = Modifier.size(24.dp),
        )
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

/** Static reciter label; see TODO at the call site. */
private const val RECITER_NAME = "Husary Mu'allim"
