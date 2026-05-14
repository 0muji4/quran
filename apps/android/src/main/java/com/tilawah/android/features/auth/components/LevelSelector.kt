package com.tilawah.android.features.auth.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.features.auth.Level
import com.tilawah.android.features.auth.LevelOptions

/**
 * Single-select stack of radio cards used on the sign-up screen. UI-only
 * for now (parity with the web `LevelSelector.tsx`); the chosen value
 * stays in the AuthViewModel and is not sent to the BFF.
 */
@Composable
fun LevelSelector(
    selection: Level,
    onSelect: (Level) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val spacing = BrandTheme.spacing
    val colors = BrandTheme.colors
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(spacing.xs)) {
        Text(
            text = "YOUR LEVEL",
            style = BrandTheme.typography.eyebrow.copy(fontWeight = FontWeight.SemiBold),
            color = colors.textSecondary,
        )
        LevelOptions.forEach { option ->
            val active = option.level == selection
            Surface(
                shape = RoundedCornerShape(spacing.md),
                color = if (active) colors.primary.copy(alpha = 0.08f) else colors.card,
                border = BorderStroke(
                    width = if (active) 1.5.dp else 1.dp,
                    color = if (active) colors.primary else colors.tile,
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .selectable(
                        selected = active,
                        enabled = enabled,
                        role = Role.RadioButton,
                        onClick = { onSelect(option.level) },
                    ),
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(spacing.md),
                ) {
                    RadioButton(
                        selected = active,
                        onClick = null,
                        enabled = enabled,
                        colors = RadioButtonDefaults.colors(selectedColor = colors.primary),
                    )
                    Column(modifier = Modifier.padding(start = spacing.sm)) {
                        Text(
                            text = option.level.label,
                            style = BrandTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
                            color = colors.textPrimary,
                        )
                        Text(
                            text = option.level.description,
                            style = BrandTheme.typography.caption,
                            color = colors.textSecondary,
                        )
                    }
                }
            }
        }
    }
}

