package com.tilawah.android.features.practice

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tilawah.android.R
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.designsystem.components.PrimaryButton

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
        val surahNameEn = surah?.nameEn.orEmpty()
        val ayahCount = surah?.ayahCount ?: 0
        Header(
            title = headerTitle(surahNameEn, ayah?.ayahNumber),
            onNavigateBack = onNavigateBack,
        )
        PracticeProgress(currentAyah = ayah?.ayahNumber, ayahCount = ayahCount)
        ayah?.let { AyahCard(it, surahNameEn = surahNameEn) }

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

/**
 * Combines the surah name and ayah number into the single centered title
 * the header shows (e.g. "Al-Fatihah · ayah 2"). Falls back to a plain
 * "Practice" label before the surah metadata has loaded.
 */
@Composable
private fun headerTitle(surahNameEn: String, currentAyah: Int?): String {
    if (surahNameEn.isEmpty()) return stringResource(R.string.practice_default_title)
    return stringResource(
        R.string.practice_header_title,
        surahNameEn,
        currentAyah ?: 1,
    )
}

@Composable
private fun Header(
    title: String,
    onNavigateBack: () -> Unit,
) {
    com.tilawah.android.designsystem.components.ScreenHeader(
        title = title,
        onBack = onNavigateBack,
        backContentDescription = stringResource(R.string.practice_back_a11y),
        // Overflow is a placeholder hook; the menu (change reciter, report)
        // lands in a follow-up. TODO: wire onMore once the menu exists.
        onMore = {},
        moreContentDescription = stringResource(R.string.practice_more_a11y),
    )
}

/**
 * Ayah progress indicator. Short surahs render as a row of elongated
 * rounded pill segments (active = wider + teal); long surahs would blow
 * past the screen width, so above [MAX_SEGMENTS] we collapse to a single
 * [com.tilawah.android.designsystem.components.BrandProgressBar]-style bar
 * with an "n / total" count label.
 */
@Composable
private fun PracticeProgress(currentAyah: Int?, ayahCount: Int) {
    if (ayahCount <= 1) return
    val active = (currentAyah ?: 1).coerceIn(1, ayahCount)
    if (ayahCount <= MAX_SEGMENTS) {
        ProgressSegments(active = active, ayahCount = ayahCount)
    } else {
        LongSurahProgress(active = active, ayahCount = ayahCount)
    }
}

@Composable
private fun ProgressSegments(active: Int, ayahCount: Int) {
    val colors = BrandTheme.colors
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(BrandTheme.spacing.xs),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        for (i in 1..ayahCount) {
            val isActive = i == active
            Box(
                modifier = Modifier
                    .height(4.dp)
                    .width(if (isActive) 24.dp else 14.dp)
                    .clip(RoundedCornerShape(percent = 50))
                    .background(if (isActive) colors.primary else colors.tile),
            )
        }
    }
}

@Composable
private fun LongSurahProgress(active: Int, ayahCount: Int) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing
    val fraction = active.toFloat() / ayahCount.toFloat()
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(spacing.md),
    ) {
        Box(
            modifier = Modifier
                .weight(1f)
                .height(4.dp)
                .clip(RoundedCornerShape(percent = 50))
                .background(colors.tile),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(fraction.coerceIn(0f, 1f))
                    .height(4.dp)
                    .clip(RoundedCornerShape(percent = 50))
                    .background(colors.primary),
            )
        }
        Text(
            text = stringResource(R.string.practice_ayah_count, active, ayahCount),
            style = typography.caption,
            color = colors.textSecondary,
            textAlign = TextAlign.End,
        )
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

/** Above this many ayat, segment dots wrap awkwardly — fall back to a bar. */
private const val MAX_SEGMENTS = 12
