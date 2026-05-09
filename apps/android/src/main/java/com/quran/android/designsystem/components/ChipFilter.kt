package com.quran.android.designsystem.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.quran.android.designsystem.BrandTheme

/**
 * Pill-shaped row of single-select chips. Mirrors
 * `apps/ios/.../DesignSystem/Components/ChipFilter.swift`.
 *
 * The selected chip uses the brand primary as a background; unselected
 * chips render a transparent outline using the tile color so the
 * selection contrast carries the design's intention.
 */
data class FilterChip<T>(val value: T, val label: String)

@Composable
fun <T> ChipFilter(
    items: List<FilterChip<T>>,
    selection: T,
    onSelect: (T) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing

    LazyRow(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(spacing.sm),
        contentPadding = PaddingValues(horizontal = spacing.screenHorizontal),
    ) {
        items(items) { chip ->
            val active = chip.value == selection
            Text(
                text = chip.label,
                style = typography.caption.copy(fontWeight = FontWeight.SemiBold),
                color = if (active) colors.textOnPrimary else colors.textPrimary,
                modifier = Modifier
                    .clip(RoundedCornerShape(percent = 50))
                    .background(if (active) colors.primary else colors.tile)
                    .clickable { onSelect(chip.value) }
                    .padding(horizontal = spacing.lg, vertical = 10.dp),
            )
        }
    }
}
