package tv.every.tilawah.android.designsystem.components

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import tv.every.tilawah.android.designsystem.BrandTheme

/**
 * Pill-shaped primary action button. Used for "Resume ayah",
 * "Continue to ayah", "Record again", and similar calls-to-action.
 * Ensures WCAG-compliant tap height via `BrandTheme.spacing.minTapTarget`.
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
) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    val container = when (tint) {
        PrimaryButtonTint.Primary -> colors.primary
        PrimaryButtonTint.Accent -> colors.accent
    }
    Button(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = spacing.minTapTarget),
        enabled = enabled,
        shape = RoundedCornerShape(percent = 50),
        colors = ButtonDefaults.buttonColors(
            containerColor = container,
            contentColor = colors.textOnPrimary,
            disabledContainerColor = container.copy(alpha = 0.4f),
            disabledContentColor = colors.textOnPrimary.copy(alpha = 0.7f),
        ),
    ) {
        Text(
            text = label,
            style = BrandTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
        )
    }
}
