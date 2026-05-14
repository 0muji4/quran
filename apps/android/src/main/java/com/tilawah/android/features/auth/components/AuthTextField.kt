package com.tilawah.android.features.auth.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import com.tilawah.android.designsystem.BrandTheme

/**
 * Caps-lock label + rounded outlined text field used by the sign-in
 * and sign-up forms ("EMAIL", "YOUR NAME"). The label sits above the
 * field rather than as a floating placeholder to match the design.
 */
@Composable
fun AuthTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    keyboardType: KeyboardType = KeyboardType.Text,
    enabled: Boolean = true,
) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(spacing.xs)) {
        Text(
            text = label,
            style = BrandTheme.typography.eyebrow.copy(fontWeight = FontWeight.SemiBold),
            color = colors.textSecondary,
        )
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            enabled = enabled,
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            shape = RoundedCornerShape(spacing.md),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = colors.card,
                unfocusedContainerColor = colors.card,
                focusedBorderColor = colors.primary,
                unfocusedBorderColor = colors.tile,
            ),
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = spacing.minTapTarget),
        )
    }
}
