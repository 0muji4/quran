package tv.every.tilawah.android.features.result

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.every.tilawah.android.R
import tv.every.tilawah.android.app.AppError
import tv.every.tilawah.android.designsystem.BrandTheme
import tv.every.tilawah.android.designsystem.components.PrimaryButton

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
    val spacing = BrandTheme.spacing
    val scroll = rememberScrollState()

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(scroll)
            .padding(horizontal = spacing.screenHorizontal, vertical = spacing.lg),
        verticalArrangement = Arrangement.spacedBy(spacing.lg),
    ) {
        Header(onNavigateBack = onNavigateBack)
        when (val current = state) {
            ResultDetailViewModel.UiState.Loading -> Loading()
            is ResultDetailViewModel.UiState.Loaded -> Loaded(
                state = current,
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
private fun Header(onNavigateBack: () -> Unit) {
    androidx.compose.foundation.layout.Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onNavigateBack) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = stringResource(R.string.result_back_a11y),
            )
        }
        Text(
            text = stringResource(R.string.result_title),
            style = BrandTheme.typography.sectionTitle,
            color = BrandTheme.colors.textPrimary,
        )
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
        // PR 21 -> ListenBackSection(state.result.feedback?.referenceAudioUrl, ...)
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
