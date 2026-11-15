package com.tilawah.android.features.practice

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tilawah.android.R
import com.tilawah.android.backend.AyahDetail
import com.tilawah.android.backend.SurahSummary
import com.tilawah.android.designsystem.AppTheme
import com.tilawah.android.designsystem.components.AppButton
import com.tilawah.android.designsystem.components.AppButtonVariant
import com.tilawah.android.designsystem.components.AppPanel
import com.tilawah.android.designsystem.components.AppVerdict
import com.tilawah.android.designsystem.components.AppVerdictChip
import com.tilawah.android.designsystem.components.AppVerdictEmphasis
import com.tilawah.android.features.result.VerdictBand
import com.tilawah.android.features.result.verdictBandForScore

/**
 * The Practice screen, on [AppTheme] (ADR 0026) and Material 3 components
 * (ADR 0030). The agreed mockup is the Practice canvas linked from #596.
 *
 * The screen draws itself in [AppTheme]; the navigation bar around it still
 * belongs to the app root.
 */
@Composable
fun PracticeScreen(
    viewModel: PracticeViewModel,
    onNavigateBack: () -> Unit,
    onResultRequested: (jobId: String) -> Unit,
    onNavigateToAyah: (Int) -> Unit,
    onRequestPermission: () -> Unit,
    hasMicPermission: Boolean,
    modifier: Modifier = Modifier,
) {
    BackHandler(onBack = onNavigateBack)
    val state by viewModel.state.collectAsStateWithLifecycle()
    val ayah by viewModel.ayah.collectAsStateWithLifecycle()
    val surah by viewModel.surah.collectAsStateWithLifecycle()
    val reference by viewModel.reference.collectAsStateWithLifecycle()
    val playerState by viewModel.player.state.collectAsStateWithLifecycle()

    AppTheme {
        PracticeContent(
            state = state,
            ayah = ayah,
            surah = surah,
            reference = when (val r = reference) {
                is TeacherReferenceState.Ready -> TeacherReferenceState.Ready(playerState)
                else -> r
            },
            onNavigateBack = onNavigateBack,
            onNavigateToAyah = onNavigateToAyah,
            onStartRecording = {
                if (hasMicPermission) viewModel.startRecording() else onRequestPermission()
            },
            onStopRecording = viewModel::stopRecording,
            onPlayReference = viewModel::playReference,
            onPauseReference = viewModel::pauseReference,
            onSetReferenceRate = viewModel::setReferenceRate,
            onRetryReference = viewModel::retryReference,
            onViewResult = onResultRequested,
            onReplay = {
                viewModel.lastRecording?.let(viewModel::viewModelScopeLaunchUploadAndScore)
                    ?: viewModel.resetIdle()
            },
            onRecordAgain = viewModel::resetIdle,
            modifier = modifier,
        )
    }
}

/**
 * The Practice screen drawn from its state, so any state renders without a
 * ViewModel. The top app bar and the state panel stay in place; the ayah,
 * the teacher recitation and the ayah navigation scroll between them, so the
 * record button stays on screen for a long ayah.
 */
@Composable
internal fun PracticeContent(
    state: PracticeState,
    ayah: AyahDetail?,
    surah: SurahSummary?,
    reference: TeacherReferenceState,
    onNavigateBack: () -> Unit,
    onNavigateToAyah: (Int) -> Unit,
    onStartRecording: () -> Unit,
    onStopRecording: () -> Unit,
    onPlayReference: () -> Unit,
    onPauseReference: () -> Unit,
    onSetReferenceRate: (Float) -> Unit,
    onRetryReference: () -> Unit,
    onViewResult: (jobId: String) -> Unit,
    onReplay: () -> Unit,
    onRecordAgain: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val spacing = AppTheme.spacing
    val surahNameEn = surah?.nameEn.orEmpty()
    val ayahCount = surah?.ayahCount ?: 0
    val currentAyah = ayah?.ayahNumber

    Surface(modifier = modifier.fillMaxSize(), color = AppTheme.colorScheme.surface) {
        Column(modifier = Modifier.fillMaxSize()) {
            PracticeTopBar(
                surahNameEn = surahNameEn,
                currentAyah = currentAyah,
                ayahCount = ayahCount,
                onNavigateBack = onNavigateBack,
            )
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = spacing.space4)
                    .padding(top = spacing.space1, bottom = spacing.space3),
                verticalArrangement = Arrangement.spacedBy(spacing.space3),
            ) {
                if (currentAyah != null && ayahCount > 1) {
                    LinearProgressIndicator(
                        progress = { currentAyah.toFloat() / ayahCount },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                ayah?.let { AyahCard(ayah = it, surahNameEn = surahNameEn) }
                TeacherReferencePanel(
                    state = reference,
                    onPlay = onPlayReference,
                    onPause = onPauseReference,
                    onSetRate = onSetReferenceRate,
                    onRetry = onRetryReference,
                )
                if (currentAyah != null && ayahCount > 0) {
                    AyahNavRow(
                        currentAyah = currentAyah,
                        ayahCount = ayahCount,
                        onNavigateToAyah = onNavigateToAyah,
                    )
                }
            }
            val panelModifier = Modifier
                .fillMaxWidth()
                .padding(start = spacing.space4, end = spacing.space4, bottom = spacing.space4)
            when (val current = state) {
                PracticeState.Idle, is PracticeState.Recording -> RecordingPanel(
                    state = current,
                    onStart = onStartRecording,
                    onStop = onStopRecording,
                    modifier = panelModifier,
                )
                PracticeState.Uploading -> AnalysingPanel(step = AnalysingStep.Transcribing, modifier = panelModifier)
                is PracticeState.Analysing -> AnalysingPanel(step = current.step, modifier = panelModifier)
                is PracticeState.Done -> DonePanel(
                    score = current.score,
                    onViewResult = { onViewResult(current.jobId) },
                    onRecordAgain = onRecordAgain,
                    modifier = panelModifier,
                )
                is PracticeState.Error -> PracticeErrorPanel(
                    error = current.error,
                    onReplay = onReplay,
                    onRecordAgain = onRecordAgain,
                    modifier = panelModifier,
                )
            }
        }
    }
}

/**
 * A Material 3 top app bar: the surah name, the ayah position under it, a
 * back button and the overflow menu.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PracticeTopBar(
    surahNameEn: String,
    currentAyah: Int?,
    ayahCount: Int,
    onNavigateBack: () -> Unit,
) {
    TopAppBar(
        title = {
            Column {
                Text(
                    text = surahNameEn.ifEmpty { stringResource(R.string.practice_default_title) },
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                if (currentAyah != null && ayahCount > 0) {
                    Text(
                        text = stringResource(R.string.practice_ayah_progress, currentAyah, ayahCount),
                        style = AppTheme.typography.bodyMedium,
                        color = AppTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        },
        navigationIcon = {
            IconButton(onClick = onNavigateBack) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = stringResource(R.string.practice_back_a11y),
                )
            }
        },
        actions = {
            // The menu (change reciter, report) is not built yet; the button
            // holds its place in the bar.
            IconButton(onClick = {}) {
                Icon(
                    imageVector = Icons.Filled.MoreVert,
                    contentDescription = stringResource(R.string.practice_more_a11y),
                )
            }
        },
    )
}

/** Previous and next ayah, each disabled at the surah's ends. */
@Composable
private fun AyahNavRow(
    currentAyah: Int,
    ayahCount: Int,
    onNavigateToAyah: (Int) -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space2),
    ) {
        AppButton(
            text = stringResource(R.string.practice_previous_ayah),
            onClick = { onNavigateToAyah(currentAyah - 1) },
            modifier = Modifier.weight(1f),
            variant = AppButtonVariant.Text,
            enabled = currentAyah > 1,
        )
        AppButton(
            text = stringResource(R.string.practice_next_ayah),
            onClick = { onNavigateToAyah(currentAyah + 1) },
            modifier = Modifier.weight(1f),
            variant = AppButtonVariant.Text,
            enabled = currentAyah < ayahCount,
        )
    }
}

/**
 * The score out of 100 with the overall verdict, and the two next steps. The
 * verdict comes from the same score bands as the Result screen.
 */
@Composable
private fun DonePanel(
    score: Int?,
    onViewResult: () -> Unit,
    onRecordAgain: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val spacing = AppTheme.spacing
    val band = verdictBandForScore(score)
    AppPanel(modifier = modifier) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(spacing.space2),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                modifier = Modifier.weight(1f),
                horizontalArrangement = Arrangement.spacedBy(spacing.space1),
            ) {
                if (score != null) {
                    Text(
                        text = score.toString(),
                        modifier = Modifier.alignByBaseline(),
                        style = AppTheme.typography.displayMedium,
                        color = AppTheme.colorScheme.primary,
                    )
                    Text(
                        text = stringResource(R.string.practice_done_out_of),
                        modifier = Modifier.alignByBaseline(),
                        style = AppTheme.typography.bodyLarge,
                        color = AppTheme.colorScheme.onSurfaceVariant,
                    )
                } else {
                    Text(
                        text = stringResource(R.string.practice_done_title),
                        style = AppTheme.typography.titleMedium,
                    )
                }
            }
            band.appVerdict?.let { verdict ->
                AppVerdictChip(
                    verdict = verdict,
                    label = stringResource(band.badgeRes),
                    emphasis = AppVerdictEmphasis.Overall,
                )
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(spacing.space2)) {
            AppButton(
                text = stringResource(R.string.practice_done_record_again),
                onClick = onRecordAgain,
                modifier = Modifier.weight(1f),
                variant = AppButtonVariant.Outlined,
            )
            AppButton(
                text = stringResource(R.string.practice_done_view_result),
                onClick = onViewResult,
                modifier = Modifier.weight(1f),
                variant = AppButtonVariant.Filled,
            )
        }
    }
}

/** The verdict chip a score band shows; none while the score is not in yet. */
private val VerdictBand.appVerdict: AppVerdict?
    get() = when (this) {
        VerdictBand.Mastered, VerdictBand.Great -> AppVerdict.Pass
        VerdictBand.Midway -> AppVerdict.Warn
        VerdictBand.Beginner -> AppVerdict.Fail
        VerdictBand.Awaiting -> null
    }
