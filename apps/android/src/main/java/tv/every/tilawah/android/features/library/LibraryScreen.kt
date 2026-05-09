package tv.every.tilawah.android.features.library

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.every.tilawah.android.R
import tv.every.tilawah.android.app.AppError
import tv.every.tilawah.android.backend.SurahSummary
import tv.every.tilawah.android.designsystem.BrandTheme
import tv.every.tilawah.android.designsystem.components.PrimaryButton

/**
 * Library tab — vertical list of surahs preceded by an eyebrow / title
 * header. Mirrors `apps/ios/.../Features/Library/LibraryView.swift`.
 *
 * Search bar + difficulty chips arrive in PR 10; the Continue card
 * driven by `HistoryStore.lastPracticed()` arrives in PR 11.
 */
@Composable
fun LibraryScreen(
    viewModel: LibraryViewModel,
    onSurahOpened: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        if (state is LibraryUiState.Idle) viewModel.load()
    }

    val spacing = BrandTheme.spacing
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = spacing.screenHorizontal, vertical = spacing.lg),
        verticalArrangement = Arrangement.spacedBy(spacing.lg),
    ) {
        Header()
        when (val current = state) {
            LibraryUiState.Idle, LibraryUiState.Loading -> LoadingState()
            is LibraryUiState.Loaded -> SurahList(
                surahs = current.surahs,
                onSurahOpened = { surah ->
                    viewModel.surahOpened(surah)
                    onSurahOpened(surah.id)
                },
            )
            is LibraryUiState.Failed -> ErrorState(
                error = current.error,
                onRetry = { viewModel.load() },
            )
        }
    }
}

@Composable
private fun Header() {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    Column(verticalArrangement = Arrangement.spacedBy(BrandTheme.spacing.xs)) {
        Text(
            text = stringResource(R.string.library_eyebrow),
            style = typography.eyebrow,
            color = colors.accent,
        )
        Text(
            text = stringResource(R.string.library_title),
            style = typography.pageTitle,
            color = colors.textPrimary,
        )
    }
}

@Composable
private fun LoadingState() {
    Box(
        modifier = Modifier.fillMaxWidth().padding(top = BrandTheme.spacing.xxl),
        contentAlignment = Alignment.Center,
    ) {
        CircularProgressIndicator(color = BrandTheme.colors.primary)
    }
}

@Composable
private fun SurahList(
    surahs: List<SurahSummary>,
    onSurahOpened: (SurahSummary) -> Unit,
) {
    if (surahs.isEmpty()) {
        Text(
            text = stringResource(R.string.library_empty),
            style = BrandTheme.typography.body,
            color = BrandTheme.colors.textSecondary,
        )
        return
    }
    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(BrandTheme.spacing.sm),
    ) {
        items(surahs.size) { index ->
            SurahRow(
                index = index + 1,
                surah = surahs[index],
                onClick = { onSurahOpened(surahs[index]) },
            )
        }
    }
}

@Composable
private fun ErrorState(error: AppError, onRetry: () -> Unit) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(spacing.md),
        horizontalAlignment = Alignment.CenterHorizontally,
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
        if (error.isRetriable) {
            PrimaryButton(
                label = stringResource(R.string.library_retry),
                onClick = onRetry,
            )
        }
    }
}
