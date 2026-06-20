package com.tilawah.android.designsystem.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tilawah.android.designsystem.BrandTheme

/**
 * Pill-shaped primary action button. Used for "Resume ayah",
 * "Continue to ayah", "Record again", and similar calls-to-action.
 * Ensures WCAG-compliant tap height via `BrandTheme.spacing.minTapTarget`.
 *
 * [tint] selects the fill: teal [PrimaryButtonTint.Primary] (white text)
 * or gold [PrimaryButtonTint.Accent]. Gold pairs with DARK text per
 * ADR 0003 — white-on-gold fails WCAG AA, so the accent tint uses
 * `textPrimary` for its label.
 *
 * Set [fillWidth] = false for content-sized buttons that sit side by
 * side (e.g. the Practice error panel's Replay / Record again row).
 *
 * Mirrors `apps/ios/Sources/QuranRecitationApp/DesignSystem/Components/PrimaryButtonStyle.swift`.
 */
enum class PrimaryButtonTint {
    Primary,
    Accent,
}

@Composable
fun PrimaryButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    tint: PrimaryButtonTint = PrimaryButtonTint.Primary,
    enabled: Boolean = true,
    fillWidth: Boolean = true,
    trailingIcon: ImageVector? = null,
) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    val container = when (tint) {
        PrimaryButtonTint.Primary -> colors.primary
        PrimaryButtonTint.Accent -> colors.accent
    }
    val onContainer = when (tint) {
        PrimaryButtonTint.Primary -> colors.textOnPrimary
        PrimaryButtonTint.Accent -> colors.textPrimary
    }
    Button(
        onClick = onClick,
        modifier = modifier
            .then(if (fillWidth) Modifier.fillMaxWidth() else Modifier)
            .heightIn(min = spacing.minTapTarget),
        enabled = enabled,
        shape = RoundedCornerShape(percent = 50),
        colors = ButtonDefaults.buttonColors(
            containerColor = container,
            contentColor = onContainer,
            disabledContainerColor = container.copy(alpha = 0.4f),
            disabledContentColor = onContainer.copy(alpha = 0.7f),
        ),
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(spacing.sm, Alignment.CenterHorizontally),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = label,
                style = BrandTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
            )
            if (trailingIcon != null) {
                Icon(
                    imageVector = trailingIcon,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                )
            }
        }
    }
}
