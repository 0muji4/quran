package com.tilawah.android.features.practice

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import com.tilawah.android.R
import com.tilawah.android.app.AppError
import com.tilawah.android.audio.PlayerState
import com.tilawah.android.designsystem.AppTheme
import com.tilawah.android.designsystem.components.AppButton
import com.tilawah.android.designsystem.components.AppButtonVariant
import com.tilawah.android.designsystem.components.AppChip
import com.tilawah.android.designsystem.components.AppPanel
import com.tilawah.android.designsystem.components.AppTonalIconButton
import java.text.DecimalFormat

/**
 * The teacher recitation: a play/pause button, the reciter and length, and
 * the playback speed as a chip that opens a menu. When the recitation is
 * unavailable, the panel says so and offers a retry; the user can still
 * record on their own.
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
    val spacing = AppTheme.spacing
    AppPanel(
        modifier = modifier.fillMaxWidth(),
        contentPadding = PaddingValues(horizontal = spacing.space4, vertical = spacing.space3),
    ) {
        when (state) {
            is TeacherReferenceState.Loading -> Text(
                text = stringResource(R.string.practice_reference_loading),
                style = AppTheme.typography.bodyMedium,
                color = AppTheme.colorScheme.onSurfaceVariant,
            )
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
private fun Controls(
    player: PlayerState,
    onPlay: () -> Unit,
    onPause: () -> Unit,
    onSetRate: (Float) -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4),
    ) {
        AppTonalIconButton(
            icon = if (player.isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
            contentDescription = stringResource(
                if (player.isPlaying) R.string.practice_reference_pause_a11y else R.string.practice_reference_play_a11y,
            ),
            onClick = if (player.isPlaying) onPause else onPlay,
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = stringResource(R.string.practice_reference_title),
                style = AppTheme.typography.bodyLarge,
            )
            Text(
                // The reciter is fixed until the BFF returns recitation
                // metadata (reciter and style) per ayah.
                text = stringResource(R.string.practice_reference_meta, RECITER_NAME, formatTime(player.durationMs)),
                style = AppTheme.typography.bodyMedium,
                color = AppTheme.colorScheme.onSurfaceVariant,
            )
        }
        RateChip(rate = player.rate, onSetRate = onSetRate)
    }
}

/** The playback speed, as an assist chip that opens a menu of [PLAYBACK_RATES]. */
@Composable
private fun RateChip(rate: Float, onSetRate: (Float) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    val speedA11y = stringResource(R.string.practice_reference_speed_a11y)
    Box {
        AppChip(
            label = rateLabel(rate),
            onClick = { expanded = true },
            modifier = Modifier.semantics { contentDescription = speedA11y },
            trailingIcon = Icons.Filled.ArrowDropDown,
        )
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            PLAYBACK_RATES.forEach { option ->
                DropdownMenuItem(
                    text = { Text(rateLabel(option)) },
                    onClick = {
                        expanded = false
                        onSetRate(option)
                    },
                )
            }
        }
    }
}

@Composable
private fun Unavailable(onRetry: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space2),
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = stringResource(R.string.practice_reference_unavailable),
                style = AppTheme.typography.bodyLarge,
            )
            Text(
                text = stringResource(R.string.practice_reference_unavailable_hint),
                style = AppTheme.typography.bodyMedium,
                color = AppTheme.colorScheme.onSurfaceVariant,
            )
        }
        AppButton(
            text = stringResource(R.string.practice_reference_retry),
            onClick = onRetry,
            variant = AppButtonVariant.Text,
        )
    }
}

/** A rate as the menu and chip show it: "0.75×", "1×", "1.25×". */
private fun rateLabel(rate: Float): String = DecimalFormat("0.##").format(rate) + "×"

private fun formatTime(ms: Long): String {
    val totalSeconds = (ms / 1000).coerceAtLeast(0)
    return "%d:%02d".format(totalSeconds / 60, totalSeconds % 60)
}

/** The speeds the teacher recitation offers. */
internal val PLAYBACK_RATES = listOf(0.75f, 1f, 1.25f)

/** The reciter of the teacher recitation; see the note in [Controls]. */
private const val RECITER_NAME = "Husary Mu'allim"
