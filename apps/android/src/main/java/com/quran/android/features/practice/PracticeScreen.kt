package com.quran.android.features.practice

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.quran.android.R
import com.quran.android.designsystem.BrandTheme
import com.quran.android.designsystem.components.PrimaryButton

/**
 * Practice tab — composes header, AyahCard, TeacherReferencePanel,
 * and the state-driven panel (Recording / Analysing / Error / Done)
 * mirroring `apps/ios/.../Features/Practice/PracticeView.swift`.
 *
 * `onResultRequested` is invoked when the score is in; PR 18 wires
 * the Result detail screen behind it.
 */
@Composable
fun PracticeScreen(
    viewModel: PracticeViewModel,
    onNavigateBack: () -> Unit,
    onResultRequested: (jobId: String) -> Unit,
    onRequestPermission: () -> Unit,
    hasMicPermission: Boolean,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val ayah by viewModel.ayah.collectAsStateWithLifecycle()
    val surah by viewModel.surah.collectAsStateWithLifecycle()
    val reference by viewModel.reference.collectAsStateWithLifecycle()
    val playerState by viewModel.player.state.collectAsStateWithLifecycle()
    val spacing = BrandTheme.spacing
    val scroll = rememberScrollState()

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(scroll)
            .padding(horizontal = spacing.screenHorizontal, vertical = spacing.lg),
        verticalArrangement = Arrangement.spacedBy(spacing.lg),
    ) {
        Header(
            surahNameEn = surah?.nameEn.orEmpty(),
            currentAyah = ayah?.ayahNumber,
            ayahCount = surah?.ayahCount ?: 0,
            onNavigateBack = onNavigateBack,
        )
        ProgressDots(currentAyah = ayah?.ayahNumber, ayahCount = surah?.ayahCount ?: 0)
        ayah?.let { AyahCard(it) }

        TeacherReferencePanel(
            state = when (val r = reference) {
                is TeacherReferenceState.Ready -> TeacherReferenceState.Ready(playerState)
                else -> r
            },
            onPlay = viewModel::playReference,
            onPause = viewModel::pauseReference,
            onSetRate = viewModel::setReferenceRate,
            onRetry = viewModel::retryReference,
        )

        when (val current = state) {
            PracticeState.Idle, is PracticeState.Recording -> RecordingPanel(
                state = current,
                onStart = {
                    if (hasMicPermission) viewModel.startRecording() else onRequestPermission()
                },
                onStop = viewModel::stopRecording,
            )
            PracticeState.Uploading -> AnalysingPanel(step = AnalysingStep.Transcribing)
            is PracticeState.Analysing -> AnalysingPanel(step = current.step)
            is PracticeState.Done -> DonePanel(
                score = current.score,
                onViewResult = { onResultRequested(current.jobId) },
                onRecordAgain = viewModel::resetIdle,
            )
            is PracticeState.Error -> PracticeErrorPanel(
                error = current.error,
                onReplay = {
                    viewModel.lastRecording?.let(viewModel::viewModelScopeLaunchUploadAndScore)
                        ?: viewModel.resetIdle()
                },
                onRecordAgain = viewModel::resetIdle,
            )
        }
    }
}

@Composable
private fun Header(
    surahNameEn: String,
    currentAyah: Int?,
    ayahCount: Int,
    onNavigateBack: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(BrandTheme.spacing.md),
    ) {
        IconButton(onClick = onNavigateBack) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = stringResource(R.string.practice_back_a11y),
            )
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = surahNameEn.ifEmpty { stringResource(R.string.practice_default_title) },
                style = BrandTheme.typography.sectionTitle,
                color = BrandTheme.colors.textPrimary,
            )
            if (ayahCount > 0) {
                Text(
                    text = stringResource(
                        R.string.practice_ayah_progress,
                        currentAyah ?: 1,
                        ayahCount,
                    ),
                    style = BrandTheme.typography.caption,
                    color = BrandTheme.colors.textSecondary,
                )
            }
        }
    }
}

@Composable
private fun ProgressDots(currentAyah: Int?, ayahCount: Int) {
    if (ayahCount <= 1) return
    val active = currentAyah ?: 1
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(BrandTheme.spacing.xs),
    ) {
        for (i in 1..ayahCount.coerceAtMost(MAX_DOTS)) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .clip(CircleShape)
                    .background(
                        if (i == active) BrandTheme.colors.primary else BrandTheme.colors.tile,
                    ),
            )
        }
    }
}

@Composable
private fun DonePanel(
    score: Double?,
    onViewResult: () -> Unit,
    onRecordAgain: () -> Unit,
) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(spacing.md),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = stringResource(R.string.practice_done_title),
            style = typography.sectionTitle.copy(fontWeight = FontWeight.SemiBold),
            color = colors.textPrimary,
        )
        score?.let { s ->
            Text(
                text = "%.0f%%".format(s * 100),
                style = typography.scoreDisplay,
                color = colors.success,
            )
        }
        PrimaryButton(
            label = stringResource(R.string.practice_done_view_result),
            onClick = onViewResult,
        )
        PrimaryButton(
            label = stringResource(R.string.practice_done_record_again),
            onClick = onRecordAgain,
        )
    }
}

private const val MAX_DOTS = 30
