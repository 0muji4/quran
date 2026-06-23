package com.tilawah.android.features.auth.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tilawah.android.R
import com.tilawah.android.designsystem.BrandTheme

/**
 * "Continue with Google" / "Continue with Apple" buttons. Google is live
 * when [onGoogle] is provided (a server client ID is configured), else it
 * falls back to the disabled placeholder. Apple stays disabled (deferred,
 * ADR 0010). Rendered at full strength either way to match the design —
 * same approach as the web `OAuthButtons.tsx`.
 */
@Composable
fun OAuthButtons(modifier: Modifier = Modifier, onGoogle: (() -> Unit)? = null) {
    val spacing = BrandTheme.spacing
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(spacing.sm)) {
        OAuthButton(label = "Continue with Google", iconRes = R.drawable.ic_google, onClick = onGoogle)
        OAuthButton(label = "Continue with Apple", iconRes = R.drawable.ic_apple, onClick = null)
    }
}

@Composable
private fun OAuthButton(label: String, iconRes: Int, onClick: (() -> Unit)?) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    Button(
        onClick = { onClick?.invoke() },
        enabled = onClick != null,
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = spacing.minTapTarget),
        shape = RoundedCornerShape(spacing.radiusMd),
        border = BorderStroke(1.dp, colors.borderDefault),
        colors = ButtonDefaults.buttonColors(
            containerColor = colors.paper,
            contentColor = colors.textPrimary,
            disabledContainerColor = colors.paper,
            disabledContentColor = colors.textPrimary,
        ),
        contentPadding = PaddingValues(horizontal = spacing.lg),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(vertical = spacing.xs),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Image(
                painter = painterResource(iconRes),
                contentDescription = null,
                modifier = Modifier.size(20.dp),
            )
            Spacer(Modifier.width(spacing.md))
            Text(
                text = label,
                style = BrandTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
            )
        }
    }
}
