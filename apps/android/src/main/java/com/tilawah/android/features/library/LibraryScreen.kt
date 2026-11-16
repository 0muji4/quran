package com.tilawah.android.features.library

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.SearchBarDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tilawah.android.R
import com.tilawah.android.app.AppError
import com.tilawah.android.backend.SurahSummary
import com.tilawah.android.designsystem.AppTheme
import com.tilawah.android.designsystem.components.AppButton
import com.tilawah.android.designsystem.components.AppPanel
import com.tilawah.android.designsystem.components.AppPanelTone
import com.tilawah.android.storage.LastPracticed

/**
 * The Library tab, on [AppTheme] (ADR 0026) and Material 3 components
 * (ADR 0030). The agreed mockup is the Library page of the canvas linked
 * from #596.
 */
@Composable
fun LibraryScreen(
    viewModel: LibraryViewModel,
    onSurahOpened: (SurahSummary) -> Unit,
    onResume: (LastPracticed) -> Unit,
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

    AppTheme {
        LibraryContent(
            state = state,
            // Read after the flows above, so a new query or filter recomposes the list.
            visibleSurahs = if (state is LibraryUiState.Loaded) viewModel.filteredSurahs() else emptyList(),
            query = query,
            filter = filter,
            lastPracticed = lastPracticed,
            bestScores = bestScores,
            onQueryChange = viewModel::setQuery,
            onFilterChange = viewModel::setFilter,
            onResume = { entry ->
                viewModel.continueTapped(entry)
                onResume(entry)
            },
            onSurahOpened = { surah ->
                viewModel.surahOpened(surah)
                onSurahOpened(surah)
            },
            onRetry = viewModel::load,
            modifier = modifier,
        )
    }
}

/**
 * The Library drawn from its state, so any state renders without a
 * ViewModel. The top app bar and the search bar stay in place; the Continue
 * card, the filter chips and the surahs scroll below them.
 *
 * The Continue card resumes [lastPracticed] whenever there is one. Without
 * one, once the surahs are in, it offers to start at the first surah.
 */
@Composable
internal fun LibraryContent(
    state: LibraryUiState,
    visibleSurahs: List<SurahSummary>,
    query: String,
    filter: LibraryFilter,
    lastPracticed: LastPracticed?,
    bestScores: Map<String, Int>,
    onQueryChange: (String) -> Unit,
    onFilterChange: (LibraryFilter) -> Unit,
    onResume: (LastPracticed) -> Unit,
    onSurahOpened: (SurahSummary) -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val spacing = AppTheme.spacing
    val loaded = state as? LibraryUiState.Loaded
    Surface(modifier = modifier.fillMaxSize(), color = AppTheme.colorScheme.surface) {
        Column(modifier = Modifier.fillMaxSize()) {
            LibraryTopBar()
            LibrarySearchBar(
                query = query,
                onQueryChange = onQueryChange,
                modifier = Modifier.padding(horizontal = spacing.space4).padding(bottom = spacing.space2),
            )
            LazyColumn(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                contentPadding = PaddingValues(top = spacing.space2, bottom = spacing.space3),
            ) {
                val hero = Modifier.padding(horizontal = spacing.space4).padding(bottom = spacing.space3)
                when {
                    lastPracticed != null -> item(key = "continue") {
                        ContinueCard(entry = lastPracticed, onResume = { onResume(lastPracticed) }, modifier = hero)
                    }
                    loaded != null && loaded.surahs.isNotEmpty() -> item(key = "start") {
                        val first = loaded.surahs.first()
                        GetStartedCard(onStart = { onSurahOpened(first) }, modifier = hero)
                    }
                }
                item(key = "filters") {
                    FilterChips(
                        selection = filter,
                        totalCount = loaded?.surahs?.size,
                        onSelect = onFilterChange,
                    )
                }
                when (state) {
                    LibraryUiState.Idle, LibraryUiState.Loading -> item(key = "loading") {
                        Box(
                            modifier = Modifier.fillMaxWidth().padding(top = spacing.space12),
                            contentAlignment = Alignment.Center,
                        ) {
                            CircularProgressIndicator()
                        }
                    }
                    is LibraryUiState.Failed -> item(key = "failed") {
                        FailedPanel(
                            error = state.error,
                            onRetry = onRetry,
                            modifier = Modifier.padding(horizontal = spacing.space4).padding(top = spacing.space3),
                        )
                    }
                    is LibraryUiState.Loaded -> if (visibleSurahs.isEmpty()) {
                        item(key = "empty") { NoMatch() }
                    } else {
                        item(key = "gap") { Box(Modifier.padding(top = spacing.space2)) }
                        items(visibleSurahs, key = { it.id }) { surah ->
                            SurahRow(
                                // The canonical 1–114 number comes from the id; a
                                // non-numeric id falls back to the list position.
                                canonicalNumber = surah.id.toIntOrNull()
                                    ?: (state.surahs.indexOf(surah) + 1),
                                surah = surah,
                                onClick = { onSurahOpened(surah) },
                                resume = surah.id == lastPracticed?.surahId,
                                bestScore = bestScores[surah.id],
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LibraryTopBar() {
    TopAppBar(title = { Text(text = stringResource(R.string.library_title)) })
}

/**
 * A Material 3 search bar that filters the list as the user types. It does
 * not expand into a search view: the results are the list below it.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LibrarySearchBar(
    query: String,
    onQueryChange: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val keyboard = LocalSoftwareKeyboardController.current
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = CircleShape,
        color = AppTheme.colorScheme.surfaceContainerHigh,
    ) {
        SearchBarDefaults.InputField(
            query = query,
            onQueryChange = onQueryChange,
            onSearch = { keyboard?.hide() },
            expanded = false,
            onExpandedChange = {},
            placeholder = { Text(text = stringResource(R.string.library_search_placeholder)) },
            leadingIcon = { Icon(imageVector = Icons.Filled.Search, contentDescription = null) },
            trailingIcon = if (query.isNotEmpty()) {
                {
                    IconButton(onClick = { onQueryChange("") }) {
                        Icon(
                            imageVector = Icons.Filled.Close,
                            contentDescription = stringResource(R.string.library_search_clear_a11y),
                        )
                    }
                }
            } else {
                null
            },
        )
    }
}

/** One filter chip per [LibraryFilter], in a row that scrolls sideways when it does not fit. */
@Composable
private fun FilterChips(
    selection: LibraryFilter,
    totalCount: Int?,
    onSelect: (LibraryFilter) -> Unit,
) {
    val spacing = AppTheme.spacing
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = spacing.space4),
        horizontalArrangement = Arrangement.spacedBy(spacing.space2),
    ) {
        LibraryFilter.entries.forEach { option ->
            val selected = option == selection
            FilterChip(
                selected = selected,
                onClick = { onSelect(option) },
                label = { Text(text = filterLabel(option, totalCount)) },
                leadingIcon = if (selected) {
                    {
                        Icon(
                            imageVector = Icons.Filled.Check,
                            contentDescription = null,
                            modifier = Modifier.size(FilterChipDefaults.IconSize),
                        )
                    }
                } else {
                    null
                },
            )
        }
    }
}

@Composable
private fun filterLabel(filter: LibraryFilter, totalCount: Int?): String = when (filter) {
    LibraryFilter.All -> if (totalCount != null) {
        stringResource(R.string.library_filter_all_count, totalCount)
    } else {
        stringResource(R.string.library_filter_all)
    }
    LibraryFilter.Mecca -> stringResource(R.string.library_filter_mecca)
    LibraryFilter.Medina -> stringResource(R.string.library_filter_medina)
    LibraryFilter.Short -> stringResource(R.string.library_filter_short)
}

/** No surah matches the search and filter. */
@Composable
private fun NoMatch() {
    Column(
        modifier = Modifier.fillMaxWidth().padding(horizontal = AppTheme.spacing.space4)
            .padding(top = AppTheme.spacing.space12),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space2),
    ) {
        Icon(
            imageVector = Icons.Filled.Search,
            contentDescription = null,
            modifier = Modifier.size(40.dp),
            tint = AppTheme.colorScheme.onSurfaceVariant,
        )
        Text(text = stringResource(R.string.library_empty), style = AppTheme.typography.titleMedium)
        Text(
            text = stringResource(R.string.library_empty_body),
            style = AppTheme.typography.bodyMedium,
            color = AppTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun FailedPanel(error: AppError, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    AppPanel(modifier = modifier.fillMaxWidth(), tone = AppPanelTone.Error) {
        Row(horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space3)) {
            Icon(imageVector = Icons.Outlined.ErrorOutline, contentDescription = null)
            Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space1)) {
                Text(text = stringResource(error.titleRes), style = AppTheme.typography.titleMedium)
                Text(text = stringResource(error.recoveryRes), style = AppTheme.typography.bodyMedium)
            }
        }
        if (error.isRetriable) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                AppButton(text = stringResource(R.string.library_retry), onClick = onRetry)
            }
        }
    }
}
