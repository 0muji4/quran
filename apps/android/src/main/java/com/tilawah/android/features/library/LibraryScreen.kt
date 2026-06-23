package com.tilawah.android.features.library

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tilawah.android.R
import com.tilawah.android.app.AppError
import com.tilawah.android.backend.SurahSummary
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.designsystem.components.ChipFilter
import com.tilawah.android.designsystem.components.FilterChip
import com.tilawah.android.designsystem.components.PrimaryButton

/**
 * Library tab — search + chip-filtered list of surahs preceded by an
 * eyebrow / title header. Mirrors
 * `apps/ios/.../Features/Library/LibraryView.swift` at the PR 10
 * milestone (search + chips, no Continue card yet).
 */
@Composable
fun LibraryScreen(
    viewModel: LibraryViewModel,
    onSurahOpened: (SurahSummary) -> Unit,
    onResume: (com.tilawah.android.storage.LastPracticed) -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val query by viewModel.query.collectAsStateWithLifecycle()
    val filter by viewModel.filter.collectAsStateWithLifecycle()
    val lastPracticed by viewModel.lastPracticed.collectAsStateWithLifecycle()
    val bestScores by viewModel.bestScores.collectAsStateWithLifecycle()

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
        val loaded = state as? LibraryUiState.Loaded
        // The Library always leads with the dark hero card: resume the last
        // session when there is one, otherwise a get-started prompt (mirrors
        // web's ContinueCard). The get-started variant waits for the surah
        // list to load — a non-null `lastPracticed` resolves from local
        // storage well before the network fetch, so this gate shows the
        // resume card immediately and never flashes get-started first.
        val resumeEntry = lastPracticed
        when {
            resumeEntry != null -> ContinueCard(
                entry = resumeEntry,
                onResume = {
                    viewModel.continueTapped(resumeEntry)
                    onResume(resumeEntry)
                },
                modifier = Modifier.padding(horizontal = spacing.screenHorizontal),
            )
            loaded != null -> GetStartedCard(
                onStart = {
                    loaded.surahs.firstOrNull()?.let { surah ->
                        viewModel.surahOpened(surah)
                        onSurahOpened(surah)
                    }
                },
                modifier = Modifier.padding(horizontal = spacing.screenHorizontal),
            )
        }
        SearchField(
            query = query,
            onQueryChanged = viewModel::setQuery,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = spacing.screenHorizontal),
        )
        ChipFilter(
            items = filterChips(totalCount = (state as? LibraryUiState.Loaded)?.surahs?.size),
            selection = filter,
            onSelect = viewModel::setFilter,
        )
        Box(modifier = Modifier.padding(horizontal = spacing.screenHorizontal)) {
            when (val current = state) {
                LibraryUiState.Idle, LibraryUiState.Loading -> LoadingState()
                is LibraryUiState.Loaded -> SurahList(
                    surahs = viewModel.filteredSurahs(),
                    bestScores = bestScores,
                    resumeSurahId = lastPracticed?.surahId,
                    onSurahOpened = { surah ->
                        viewModel.surahOpened(surah)
                        onSurahOpened(surah)
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
        Row(
            horizontalArrangement = Arrangement.spacedBy(BrandTheme.spacing.xs),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "✦",
                style = typography.eyebrow,
                color = colors.decorative,
            )
            Text(
                text = stringResource(R.string.library_eyebrow),
                style = typography.eyebrow,
                color = colors.accent,
            )
        }
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
        leadingIcon = {
            Icon(
                imageVector = Icons.Filled.Search,
                contentDescription = null,
                tint = BrandTheme.colors.textSecondary,
            )
        },
        placeholder = { Text(stringResource(R.string.library_search_placeholder)) },
    )
}

@Composable
private fun filterChips(totalCount: Int?): List<FilterChip<LibraryFilter>> = listOf(
    FilterChip(
        LibraryFilter.All,
        if (totalCount != null) {
            stringResource(R.string.library_filter_all_count, totalCount)
        } else {
            stringResource(R.string.library_filter_all)
        },
    ),
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
    bestScores: Map<String, Int>,
    resumeSurahId: String?,
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
            val surah = surahs[index]
            // Canonical 1–114 number derived from the surah id, falling
            // back to list position when the id is non-numeric.
            val canonicalNumber = surah.id.toIntOrNull() ?: (index + 1)
            SurahRow(
                canonicalNumber = canonicalNumber,
                surah = surah,
                onClick = { onSurahOpened(surah) },
                selected = surah.id == resumeSurahId,
                bestScore = bestScores[surah.id],
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
