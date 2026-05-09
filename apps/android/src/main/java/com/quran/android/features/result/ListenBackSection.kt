package com.quran.android.features.result

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import com.quran.android.R
import com.quran.android.audio.PlayerState
import com.quran.android.designsystem.BrandTheme
import com.quran.android.designsystem.components.BrandCard
import com.quran.android.designsystem.components.PlaybackRow

/**
 * Two-row playback section: teacher reference + the user's own
 * recording. Mirrors `apps/ios/.../Features/Result/ListenBackSection.swift`.
 *
 * Each row is fed by a separate [PlayerState] / start / pause pair so
 * the parent VM can manage two `Player`s without exposing an
 * "active row" surface to the View.
 */
@Composable
fun ListenBackSection(
    teacher: PlaybackEntry?,
    you: PlaybackEntry?,
    modifier: Modifier = Modifier,
) {
    if (teacher == null && you == null) return
    BrandCard(modifier = modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(BrandTheme.spacing.md)) {
            Text(
                text = stringResource(R.string.result_listen_back_title),
                style = BrandTheme.typography.sectionTitle.copy(fontWeight = FontWeight.SemiBold),
                color = BrandTheme.colors.textPrimary,
            )
            teacher?.let {
                PlaybackRow(
                    label = stringResource(R.string.result_listen_back_teacher),
                    isPlaying = it.state.isPlaying,
                    currentMs = it.state.currentMs,
                    durationMs = it.state.durationMs,
                    onPlay = it.onPlay,
                    onPause = it.onPause,
                    accent = BrandTheme.colors.primary,
                )
            }
            you?.let {
                PlaybackRow(
                    label = stringResource(R.string.result_listen_back_you),
                    isPlaying = it.state.isPlaying,
                    currentMs = it.state.currentMs,
                    durationMs = it.state.durationMs,
                    onPlay = it.onPlay,
                    onPause = it.onPause,
                    accent = BrandTheme.colors.accent,
                )
            }
        }
    }
}

data class PlaybackEntry(
    val state: PlayerState,
    val onPlay: () -> Unit,
    val onPause: () -> Unit,
)
