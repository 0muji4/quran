package com.tilawah.android.designsystem.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.tilawah.android.designsystem.BrandTheme

/**
 * Rounded card surface used for ayah cards, library rows, and result
 * panels. Default style is cream-on-cream with a subtle shadow;
 * [BrandCardStyle.Inverse] flips to the dark variant used for the
 * Continue card and Recording panel.
 *
 * Mirrors `apps/ios/Sources/QuranRecitationApp/DesignSystem/Components/BrandCard.swift`.
 */
@Composable
fun BrandCard(
    modifier: Modifier = Modifier,
    style: BrandCardStyle = BrandCardStyle.Standard,
    border: BorderStroke? = null,
    content: @Composable () -> Unit,
) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    val background = when (style) {
        BrandCardStyle.Standard -> colors.card
        BrandCardStyle.Paper -> colors.paper
        BrandCardStyle.Inverse -> colors.cardInverse
    }
    val shadowElevation = when (style) {
        BrandCardStyle.Standard -> 2.dp
        BrandCardStyle.Paper -> 2.dp
        BrandCardStyle.Inverse -> 6.dp
    }
    val shape = RoundedCornerShape(spacing.cardCornerRadius)
    Surface(
        modifier = modifier
            .clip(shape)
            .background(background)
            .then(if (border != null) Modifier.border(border, shape) else Modifier),
        color = Color.Transparent,
        shadowElevation = shadowElevation,
    ) {
        androidx.compose.foundation.layout.Box(
            modifier = Modifier.padding(spacing.lg),
        ) {
            content()
        }
    }
}
