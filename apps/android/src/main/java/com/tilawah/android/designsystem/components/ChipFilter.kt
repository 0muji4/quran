package com.tilawah.android.designsystem.components

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
import com.tilawah.android.designsystem.BrandTheme

/**
 * Pill-shaped row of single-select chips. Mirrors
 * `apps/ios/.../DesignSystem/Components/ChipFilter.swift`.
 *
 * The selected chip uses the near-black ink surface ([BrandColors.nav])
 * with light text; unselected chips render a near-white pill
 * ([BrandColors.tileSoft]) with dark text, matching the Figma design.
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
                    .background(if (active) colors.nav else colors.tileSoft)
                    .clickable { onSelect(chip.value) }
                    .padding(horizontal = spacing.lg, vertical = spacing.sm),
            )
        }
    }
}
