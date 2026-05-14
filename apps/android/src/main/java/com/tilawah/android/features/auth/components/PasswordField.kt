package com.tilawah.android.features.auth.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import com.tilawah.android.designsystem.BrandTheme

/**
 * Password input with an inline Show / Hide toggle. Mirrors the web
 * `PasswordField.tsx` — the toggle is a real button so its state is
 * exposed to accessibility services rather than a silent type swap.
 */
@Composable
fun PasswordField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    helperText: String? = null,
) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    var visible by remember { mutableStateOf(false) }

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
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            visualTransformation = if (visible) VisualTransformation.None else PasswordVisualTransformation(),
            trailingIcon = {
                TextButton(onClick = { visible = !visible }, enabled = enabled) {
                    Text(
                        text = if (visible) "Hide" else "Show",
                        color = colors.primary,
                        style = BrandTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
                    )
                }
            },
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
        if (helperText != null) {
            Text(
                text = helperText,
                style = BrandTheme.typography.caption,
                color = colors.textSecondary,
            )
        }
    }
}
