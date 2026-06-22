package com.tilawah.android.designsystem.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import com.tilawah.android.designsystem.BrandTheme

/**
 * Pill-shaped row of single-select chips. Mirrors
 * `apps/ios/.../DesignSystem/Components/ChipFilter.swift`.
 *
 * The selected chip uses the dark forest-green brand surface
 * ([BrandColors.cardInverse]) with light text; unselected chips render a
 * near-white pill ([BrandColors.tileSoft]) with dark text and a hairline
 * [BrandColors.borderDefault] border, matching the Figma design.
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
            val shape = RoundedCornerShape(percent = 50)
            Text(
                text = chip.label,
                style = typography.caption.copy(fontWeight = FontWeight.SemiBold),
                color = if (active) colors.textOnPrimary else colors.textPrimary,
                modifier = Modifier
                    .clip(shape)
                    .background(if (active) colors.cardInverse else colors.tileSoft)
                    // Hairline lifts the near-white unselected pill off the
                    // cream page; the filled selected pill needs no outline.
                    .then(
                        if (active) Modifier
                        else Modifier.border(BorderStroke(1.dp, colors.borderDefault), shape),
                    )
                    .clickable { onSelect(chip.value) }
                    .padding(horizontal = spacing.lg, vertical = spacing.sm),
            )
        }
    }
}
