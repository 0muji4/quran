package com.tilawah.android.features.result

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tilawah.android.R
import com.tilawah.android.app.AppError
import com.tilawah.android.audio.PlayerState
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.designsystem.components.PrimaryButton
import com.tilawah.android.designsystem.components.ScreenHeader

/**
 * Result detail tab — ScoreHero + verdict badge for PR 18. PRs 19–21
 * extend with metric bars, word-comparison grid, and listen-back rows.
 */
@Composable
fun ResultDetailScreen(
    viewModel: ResultDetailViewModel,
    onNavigateBack: () -> Unit,
    onTryAgain: () -> Unit,
    onContinue: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val teacherState by (viewModel.teacherPlayer?.state
        ?: kotlinx.coroutines.flow.MutableStateFlow(null as PlayerState?))
        .collectAsStateWithLifecycle()
    val youState by (viewModel.youPlayer?.state
        ?: kotlinx.coroutines.flow.MutableStateFlow(null as PlayerState?))
        .collectAsStateWithLifecycle()
    val spacing = BrandTheme.spacing
    val scroll = rememberScrollState()

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(scroll)
            .padding(horizontal = spacing.screenHorizontal, vertical = spacing.lg),
        verticalArrangement = Arrangement.spacedBy(spacing.lg),
    ) {
        ScreenHeader(
            title = stringResource(R.string.result_title_ayah, viewModel.ayahNumber),
            onBack = onNavigateBack,
            backContentDescription = stringResource(R.string.result_back_a11y),
            onMore = {},
            moreContentDescription = stringResource(R.string.result_more_a11y),
        )
        when (val current = state) {
            ResultDetailViewModel.UiState.Loading -> Loading()
            is ResultDetailViewModel.UiState.Loaded -> Loaded(
                state = current,
                teacherPlayerState = teacherState as? PlayerState,
                youPlayerState = youState as? PlayerState,
                onPlayTeacher = {
                    current.result.feedback?.referenceAudioUrl?.let(viewModel::playTeacher)
                },
                onPauseTeacher = viewModel::pauseTeacher,
                onPlayYou = viewModel::playYou,
                onPauseYou = viewModel::pauseYou,
                onTryAgain = {
                    viewModel.tryAgain()
                    onTryAgain()
                },
                onContinue = {
                    viewModel.continueToNext()
                    onContinue()
                },
            )
            is ResultDetailViewModel.UiState.Failed -> Failed(error = current.error)
        }
    }
}

@Composable
private fun Loading() {
    Box(modifier = Modifier.fillMaxWidth().padding(top = BrandTheme.spacing.xxl), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = BrandTheme.colors.primary)
    }
}

@Composable
private fun Loaded(
    state: ResultDetailViewModel.UiState.Loaded,
    teacherPlayerState: PlayerState?,
    youPlayerState: PlayerState?,
    onPlayTeacher: () -> Unit,
    onPauseTeacher: () -> Unit,
    onPlayYou: () -> Unit,
    onPauseYou: () -> Unit,
    onTryAgain: () -> Unit,
    onContinue: () -> Unit,
) {
    val spacing = BrandTheme.spacing
    Column(
        verticalArrangement = Arrangement.spacedBy(spacing.lg),
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.fillMaxWidth(),
    ) {
        ScoreHero(score = state.result.score, verdict = state.result.verdict)
        state.result.feedback?.let { feedback ->
            MetricBars(feedback = feedback)
            WordComparisonGrid(feedback = feedback)
        }
        val teacherUrl = state.result.feedback?.referenceAudioUrl
        ListenBackSection(
            teacher = teacherPlayerState?.takeIf { teacherUrl != null }?.let {
                PlaybackEntry(state = it, onPlay = onPlayTeacher, onPause = onPauseTeacher)
            },
            you = youPlayerState?.let {
                PlaybackEntry(state = it, onPlay = onPlayYou, onPause = onPauseYou)
            },
        )
        PrimaryButton(
            label = stringResource(R.string.result_try_again),
            onClick = onTryAgain,
        )
        PrimaryButton(
            label = stringResource(R.string.result_continue),
            onClick = onContinue,
        )
    }
}

@Composable
private fun Failed(error: AppError) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(spacing.md),
    ) {
        Text(
            text = stringResource(error.titleRes),
            style = typography.sectionTitle,
            color = colors.textPrimary,
        )
        Text(
            text = stringResource(error.recoveryRes),
            style = typography.caption,
            color = colors.textSecondary,
        )
    }
}
