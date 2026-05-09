package tv.every.tilawah.android.features.library

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedTextField
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
import tv.every.tilawah.android.designsystem.components.ChipFilter
import tv.every.tilawah.android.designsystem.components.FilterChip
import tv.every.tilawah.android.designsystem.components.PrimaryButton

/**
 * Library tab — search + chip-filtered list of surahs preceded by an
 * eyebrow / title header. Mirrors
 * `apps/ios/.../Features/Library/LibraryView.swift` at the PR 10
 * milestone (search + chips, no Continue card yet).
 */
@Composable
fun LibraryScreen(
    viewModel: LibraryViewModel,
    onSurahOpened: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val query by viewModel.query.collectAsStateWithLifecycle()
    val filter by viewModel.filter.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        if (state is LibraryUiState.Idle) viewModel.load()
    }

    val spacing = BrandTheme.spacing
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(vertical = spacing.lg),
        verticalArrangement = Arrangement.spacedBy(spacing.lg),
    ) {
        Header()
        SearchField(
            query = query,
            onQueryChanged = viewModel::setQuery,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = spacing.screenHorizontal),
        )
        ChipFilter(
            items = filterChips(),
            selection = filter,
            onSelect = viewModel::setFilter,
        )
        Box(modifier = Modifier.padding(horizontal = spacing.screenHorizontal)) {
            when (val current = state) {
                LibraryUiState.Idle, LibraryUiState.Loading -> LoadingState()
                is LibraryUiState.Loaded -> SurahList(
                    surahs = viewModel.filteredSurahs(),
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
}

@Composable
private fun Header() {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    Column(
        modifier = Modifier.padding(horizontal = BrandTheme.spacing.screenHorizontal),
        verticalArrangement = Arrangement.spacedBy(BrandTheme.spacing.xs),
    ) {
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
private fun SearchField(
    query: String,
    onQueryChanged: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    OutlinedTextField(
        value = query,
        onValueChange = onQueryChanged,
        modifier = modifier,
        singleLine = true,
        placeholder = { Text(stringResource(R.string.library_search_placeholder)) },
    )
}

@Composable
private fun filterChips(): List<FilterChip<LibraryFilter>> = listOf(
    FilterChip(LibraryFilter.All, stringResource(R.string.library_filter_all)),
    FilterChip(LibraryFilter.Mecca, stringResource(R.string.library_filter_mecca)),
    FilterChip(LibraryFilter.Medina, stringResource(R.string.library_filter_medina)),
    FilterChip(LibraryFilter.Short, stringResource(R.string.library_filter_short)),
)

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
