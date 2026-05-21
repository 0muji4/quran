package com.tilawah.android.features.profile

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.tilawah.android.designsystem.BrandTheme

/**
 * One-shot "Welcome back" banner shown above the Profile content after
 * a sign-in that reactivated a soft-deleted account (ADR-0024 §4).
 * Mirrors the iOS `ReactivationBanner` and the web `WelcomeBackToast`
 * — same copy, same once-per-sign-in semantics. Dismissed via the
 * close button, which calls `AuthSession.acknowledgeReactivationNotice`
 * so the banner doesn't re-appear on a tab switch.
 */
@Composable
fun ReactivationBanner(
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    Surface(
        shape = RoundedCornerShape(spacing.md),
        color = colors.primary.copy(alpha = 0.08f),
        border = BorderStroke(1.dpSafe(), colors.primary.copy(alpha = 0.25f)),
        modifier = modifier.fillMaxWidth(),
    ) {
        Row(
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(spacing.md),
            modifier = Modifier.padding(spacing.md),
        ) {
            Icon(
                imageVector = Icons.Filled.Verified,
                contentDescription = null,
                tint = colors.primary,
            )
            Column(
                verticalArrangement = Arrangement.spacedBy(spacing.xs),
                modifier = Modifier.weight(1f),
            ) {
                Text(
                    text = ProfileCopy.reactivationTitle,
                    style = BrandTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
                    color = colors.textPrimary,
                )
                Text(
                    text = ProfileCopy.reactivationBody,
                    style = BrandTheme.typography.caption,
                    color = colors.textSecondary,
                )
            }
            IconButton(onClick = onDismiss) {
                Icon(
                    imageVector = Icons.Filled.Close,
                    contentDescription = ProfileCopy.reactivationDismissA11y,
                    tint = colors.textSecondary,
                )
            }
        }
    }
}

// Tiny helper kept inline rather than importing androidx.compose.ui.unit
// to avoid widening the BrandSpacing surface for a one-off 1dp stroke.
@Composable
private fun Int.dpSafe() = androidx.compose.ui.unit.Dp(this.toFloat())
