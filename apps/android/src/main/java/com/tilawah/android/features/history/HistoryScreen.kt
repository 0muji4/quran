package com.tilawah.android.features.history

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tilawah.android.R
import com.tilawah.android.designsystem.AppTheme
import com.tilawah.android.storage.Attempt
import java.time.Instant

/**
 * The History tab, on [AppTheme] (ADR 0026) and Material 3 components
 * (ADR 0030). The agreed mockup is the History page of the canvas linked
 * from #596.
 */
@Composable
fun HistoryScreen(
    viewModel: HistoryViewModel,
    modifier: Modifier = Modifier,
) {
    val attempts by viewModel.attempts.collectAsStateWithLifecycle()
    val visibleAttempts by viewModel.filteredAttempts.collectAsStateWithLifecycle()
    val filter by viewModel.filter.collectAsStateWithLifecycle()
    val filterOptions by viewModel.filterOptions.collectAsStateWithLifecycle()

    AppTheme {
        HistoryContent(
            attempts = attempts,
            visibleAttempts = visibleAttempts,
            filter = filter,
            filterOptions = filterOptions,
            onFilterChange = viewModel::setFilter,
            modifier = modifier,
        )
    }
}

/**
 * History drawn from its state, so any state renders without a ViewModel.
 * The top app bar stays in place; the totals, the surah filter and the
 * attempts scroll below it. With no attempts at all, an empty state takes
 * the place of the totals and the filter.
 *
 * @param attempts every attempt, newest first; the totals cover all of them.
 * @param visibleAttempts the attempts that pass [filter].
 * @param now the time the totals and the "Today" / "Yesterday" labels count from.
 */
@Composable
internal fun HistoryContent(
    attempts: List<Attempt>,
    visibleAttempts: List<Attempt>,
    filter: HistoryFilter,
    filterOptions: List<HistoryFilter>,
    onFilterChange: (HistoryFilter) -> Unit,
    modifier: Modifier = Modifier,
    now: Instant = Instant.now(),
) {
    val spacing = AppTheme.spacing
    Surface(modifier = modifier.fillMaxSize(), color = AppTheme.colorScheme.surface) {
        Column(modifier = Modifier.fillMaxSize()) {
            HistoryTopBar()
            if (attempts.isEmpty()) {
                NoAttempts()
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                    contentPadding = PaddingValues(top = spacing.space2, bottom = spacing.space3),
                ) {
                    item(key = "stats") {
                        StatsGrid(
                            attempts = attempts,
                            now = now,
                            modifier = Modifier.padding(horizontal = spacing.space4).padding(bottom = spacing.space3),
                        )
                    }
                    item(key = "filters") {
                        FilterChips(selection = filter, options = filterOptions, onSelect = onFilterChange)
                    }
                    items(visibleAttempts, key = { it.id }) { attempt ->
                        AttemptRow(attempt = attempt, now = now)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun HistoryTopBar() {
    TopAppBar(title = { Text(text = stringResource(R.string.history_title)) })
}

/** One filter chip per option, in a row that scrolls sideways when it does not fit. */
@Composable
private fun FilterChips(
    selection: HistoryFilter,
    options: List<HistoryFilter>,
    onSelect: (HistoryFilter) -> Unit,
) {
    val spacing = AppTheme.spacing
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = spacing.space4)
            .padding(bottom = spacing.space2),
        horizontalArrangement = Arrangement.spacedBy(spacing.space2),
    ) {
        options.forEach { option ->
            val selected = option == selection
            FilterChip(
                selected = selected,
                onClick = { onSelect(option) },
                label = {
                    Text(
                        text = when (option) {
                            HistoryFilter.All -> stringResource(R.string.history_filter_all)
                            is HistoryFilter.Surah -> option.nameEn
                        },
                    )
                },
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

/** No attempts yet, so there is nothing to total or filter. */
@Composable
private fun NoAttempts() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = AppTheme.spacing.space4)
            .padding(top = AppTheme.spacing.space16),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space2),
    ) {
        Icon(
            imageVector = Icons.Outlined.Schedule,
            contentDescription = null,
            modifier = Modifier.size(40.dp),
            tint = AppTheme.colorScheme.onSurfaceVariant,
        )
        Text(text = stringResource(R.string.history_empty), style = AppTheme.typography.titleMedium)
        Text(
            text = stringResource(R.string.history_empty_body),
            style = AppTheme.typography.bodyMedium,
            color = AppTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
    }
}
