package com.tilawah.android.features.result

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tilawah.android.R
import com.tilawah.android.app.AppError
import com.tilawah.android.audio.PlayerState
import com.tilawah.android.designsystem.AppTheme
import com.tilawah.android.designsystem.components.AppButton
import com.tilawah.android.designsystem.components.AppButtonVariant
import com.tilawah.android.designsystem.components.AppPanel
import com.tilawah.android.designsystem.components.AppPanelTone
import kotlinx.coroutines.flow.MutableStateFlow

/**
 * The Result screen, on [AppTheme] (ADR 0026) and Material 3 components
 * (ADR 0030). The agreed mockup is the Result page of the canvas linked from
 * #596.
 */
@Composable
fun ResultDetailScreen(
    viewModel: ResultDetailViewModel,
    onNavigateBack: () -> Unit,
    onTryAgain: () -> Unit,
    onContinue: () -> Unit,
    modifier: Modifier = Modifier,
) {
    BackHandler(onBack = onNavigateBack)
    val state by viewModel.state.collectAsStateWithLifecycle()
    val teacherState by (viewModel.teacherPlayer?.state ?: MutableStateFlow(null as PlayerState?))
        .collectAsStateWithLifecycle()
    val youState by (viewModel.youPlayer?.state ?: MutableStateFlow(null as PlayerState?))
        .collectAsStateWithLifecycle()

    AppTheme {
        ResultContent(
            state = state,
            ayahNumber = viewModel.ayahNumber,
            teacherPlayer = teacherState as? PlayerState,
            youPlayer = youState as? PlayerState,
            onNavigateBack = onNavigateBack,
            onPlayTeacher = {
                (state as? ResultDetailViewModel.UiState.Loaded)?.result?.feedback?.referenceAudioUrl
                    ?.let(viewModel::playTeacher)
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
            modifier = modifier,
        )
    }
}

/**
 * The Result screen drawn from its state, so any state renders without a
 * ViewModel. The top app bar and, once the result is in, the Try again and
 * Continue buttons stay in place; the score and its details scroll between
 * them.
 */
@Composable
internal fun ResultContent(
    state: ResultDetailViewModel.UiState,
    ayahNumber: Int,
    teacherPlayer: PlayerState?,
    youPlayer: PlayerState?,
    onNavigateBack: () -> Unit,
    onPlayTeacher: () -> Unit,
    onPauseTeacher: () -> Unit,
    onPlayYou: () -> Unit,
    onPauseYou: () -> Unit,
    onTryAgain: () -> Unit,
    onContinue: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val spacing = AppTheme.spacing
    Surface(modifier = modifier.fillMaxSize(), color = AppTheme.colorScheme.surface) {
        Column(modifier = Modifier.fillMaxSize()) {
            ResultTopBar(ayahNumber = ayahNumber, onNavigateBack = onNavigateBack)
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = spacing.space4)
                    .padding(top = spacing.space1, bottom = spacing.space3),
                verticalArrangement = Arrangement.spacedBy(spacing.space3),
            ) {
                when (state) {
                    ResultDetailViewModel.UiState.Loading -> Box(
                        modifier = Modifier.fillMaxWidth().padding(top = spacing.space16),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator()
                    }
                    is ResultDetailViewModel.UiState.Loaded -> {
                        val result = state.result
                        ScoreHero(score = result.score)
                        result.feedback?.let { feedback ->
                            MetricBars(feedback = feedback)
                            WordComparisonGrid(feedback = feedback)
                        }
                        ListenBackSection(
                            teacher = teacherPlayer?.takeIf { result.feedback?.referenceAudioUrl != null }
                                ?.let { PlaybackEntry(state = it, onPlay = onPlayTeacher, onPause = onPauseTeacher) },
                            you = youPlayer?.let { PlaybackEntry(state = it, onPlay = onPlayYou, onPause = onPauseYou) },
                        )
                    }
                    is ResultDetailViewModel.UiState.Failed -> FailedPanel(error = state.error)
                }
            }
            if (state is ResultDetailViewModel.UiState.Loaded) {
                HorizontalDivider(color = AppTheme.colorScheme.outlineVariant)
                Row(
                    modifier = Modifier.fillMaxWidth().padding(spacing.space4),
                    horizontalArrangement = Arrangement.spacedBy(spacing.space2),
                ) {
                    // Continue takes the width Try again leaves, so its longer label stays on one line.
                    AppButton(
                        text = stringResource(R.string.result_try_again),
                        onClick = onTryAgain,
                        variant = AppButtonVariant.Outlined,
                    )
                    AppButton(
                        text = stringResource(R.string.result_continue),
                        onClick = onContinue,
                        modifier = Modifier.weight(1f),
                        variant = AppButtonVariant.Filled,
                    )
                }
            }
        }
    }
}

/** A Material 3 top app bar: "Result", the ayah under it, back and the overflow button. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ResultTopBar(ayahNumber: Int, onNavigateBack: () -> Unit) {
    TopAppBar(
        title = {
            Column {
                Text(text = stringResource(R.string.result_title))
                Text(
                    text = stringResource(R.string.result_subtitle_ayah, ayahNumber),
                    style = AppTheme.typography.bodyMedium,
                    color = AppTheme.colorScheme.onSurfaceVariant,
                )
            }
        },
        navigationIcon = {
            IconButton(onClick = onNavigateBack) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = stringResource(R.string.result_back_a11y),
                )
            }
        },
        actions = {
            // The menu is not built yet; the button holds its place in the bar.
            IconButton(onClick = {}) {
                Icon(imageVector = Icons.Filled.MoreVert, contentDescription = stringResource(R.string.result_more_a11y))
            }
        },
    )
}

@Composable
private fun FailedPanel(error: AppError) {
    AppPanel(modifier = Modifier.fillMaxWidth(), tone = AppPanelTone.Error) {
        Row(horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space3)) {
            Icon(imageVector = Icons.Outlined.ErrorOutline, contentDescription = null)
            Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space1)) {
                Text(text = stringResource(error.titleRes), style = AppTheme.typography.titleMedium)
                Text(text = stringResource(error.recoveryRes), style = AppTheme.typography.bodyMedium)
            }
        }
    }
}
