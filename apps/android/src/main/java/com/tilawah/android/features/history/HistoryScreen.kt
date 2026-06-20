package com.tilawah.android.features.history

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tilawah.android.R
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.designsystem.components.ChipFilter
import com.tilawah.android.designsystem.components.FilterChip

/**
 * History tab — chip filter row + scrollable list of attempts.
 * Mirrors `apps/ios/.../Features/History/HistoryView.swift` at the
 * PR 22 milestone (no StatsGrid yet — that lands in PR 23).
 */
@Composable
fun HistoryScreen(
    viewModel: HistoryViewModel,
    modifier: Modifier = Modifier,
) {
    val attempts by viewModel.filteredAttempts.collectAsStateWithLifecycle()
    val allAttempts by viewModel.attempts.collectAsStateWithLifecycle()
    val filter by viewModel.filter.collectAsStateWithLifecycle()
    val options by viewModel.filterOptions.collectAsStateWithLifecycle()

    val spacing = BrandTheme.spacing
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(vertical = spacing.lg),
        verticalArrangement = Arrangement.spacedBy(spacing.lg),
    ) {
        Header()
        Box(modifier = Modifier.padding(horizontal = spacing.screenHorizontal)) {
            StatsGrid(attempts = allAttempts)
        }
        ChipFilter(
            items = options.map { it.toFilterChip() },
            selection = filter,
            onSelect = viewModel::setFilter,
        )
        Box(modifier = Modifier.padding(horizontal = spacing.screenHorizontal)) {
            if (attempts.isEmpty()) {
                Text(
                    text = stringResource(R.string.history_empty),
                    style = BrandTheme.typography.body,
                    color = BrandTheme.colors.textSecondary,
                )
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(spacing.sm)) {
                    items(attempts.size) { index ->
                        AttemptRow(attempt = attempts[index])
                    }
                }
            }
        }
    }
}

@Composable
private fun Header() {
    Column(
        modifier = Modifier.padding(horizontal = BrandTheme.spacing.screenHorizontal),
        verticalArrangement = Arrangement.spacedBy(BrandTheme.spacing.xs),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(BrandTheme.spacing.xs),
        ) {
            // Gold "+" ornament leading the eyebrow, matching the Figma export.
            Text(
                text = "+",
                style = BrandTheme.typography.eyebrow,
                color = BrandTheme.colors.accent,
            )
            Text(
                text = stringResource(R.string.history_eyebrow),
                style = BrandTheme.typography.eyebrow,
                color = BrandTheme.colors.accent,
            )
        }
        Text(
            text = stringResource(R.string.history_title),
            style = BrandTheme.typography.pageTitle,
            color = BrandTheme.colors.textPrimary,
        )
    }
}

private fun HistoryFilter.toFilterChip(): FilterChip<HistoryFilter> = when (this) {
    HistoryFilter.All -> FilterChip(this, "All")
    is HistoryFilter.Surah -> FilterChip(this, this.nameEn)
}
