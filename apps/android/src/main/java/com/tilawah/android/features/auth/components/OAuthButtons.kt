package com.tilawah.android.features.auth.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tilawah.android.designsystem.BrandTheme

/**
 * Disabled "Continue with Google" / "Continue with Apple" buttons.
 * Provider configuration is deferred (see ADR 0010); shipping the
 * buttons in-place keeps the layout honest to the design and signals
 * the path to users — same approach as the web `OAuthButtons.tsx`.
 *
 * Both buttons are explicitly `enabled = false`. When OAuth lands,
 * flip the flag and pass `onGoogle` / `onApple` lambdas.
 */
@Composable
fun OAuthButtons(modifier: Modifier = Modifier) {
    val spacing = BrandTheme.spacing
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(spacing.sm)) {
        OAuthButton(label = "Continue with Google")
        OAuthButton(label = "Continue with Apple")
    }
}

@Composable
private fun OAuthButton(label: String) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    Button(
        onClick = {},
        enabled = false,
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = spacing.minTapTarget),
        shape = RoundedCornerShape(percent = 50),
        border = BorderStroke(1.dp, colors.tile),
        colors = ButtonDefaults.buttonColors(
            disabledContainerColor = colors.card,
            disabledContentColor = colors.textPrimary,
        ),
        contentPadding = PaddingValues(horizontal = spacing.lg),
    ) {
        Text(
            text = label,
            style = BrandTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
            modifier = Modifier.padding(vertical = spacing.xs),
        )
    }
}
