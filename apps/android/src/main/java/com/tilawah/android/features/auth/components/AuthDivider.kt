package com.tilawah.android.features.auth.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.tilawah.android.designsystem.BrandTheme

/**
 * Horizontal rule with a centred caps label, e.g. "OR WITH EMAIL"
 * (signup) or "OR" (signin). Mirrors web `Divider.tsx`.
 */
@Composable
fun AuthDivider(label: String, modifier: Modifier = Modifier) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(spacing.md),
    ) {
        HorizontalDivider(modifier = Modifier.weight(1f), color = colors.tile)
        Text(
            text = label,
            style = BrandTheme.typography.eyebrow.copy(fontWeight = FontWeight.SemiBold),
            color = colors.textSecondary,
            modifier = Modifier.padding(horizontal = spacing.xs),
        )
        HorizontalDivider(modifier = Modifier.weight(1f), color = colors.tile)
    }
}
