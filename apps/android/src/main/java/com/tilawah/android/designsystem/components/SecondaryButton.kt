package com.tilawah.android.designsystem.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tilawah.android.designsystem.BrandTheme

/**
 * Pill-shaped outlined (secondary) action button: white/transparent fill,
 * hairline border, dark label. Used where the design pairs a secondary
 * action next to a filled [PrimaryButton] (e.g. the Practice error
 * panel's "Replay" beside "Record again", or "Edit profile").
 *
 * Mirrors `apps/ios/.../DesignSystem/Components/SecondaryButtonStyle.swift`.
 */
@Composable
fun SecondaryButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    fillWidth: Boolean = true,
) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    OutlinedButton(
        onClick = onClick,
        modifier = modifier
            .then(if (fillWidth) Modifier.fillMaxWidth() else Modifier)
            .heightIn(min = spacing.minTapTarget),
        enabled = enabled,
        shape = RoundedCornerShape(percent = 50),
        border = BorderStroke(1.dp, colors.borderStrong),
        colors = ButtonDefaults.outlinedButtonColors(
            contentColor = colors.textPrimary,
        ),
    ) {
        Text(
            text = label,
            style = BrandTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
        )
    }
}
