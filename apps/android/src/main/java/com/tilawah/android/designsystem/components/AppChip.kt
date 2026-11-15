package com.tilawah.android.designsystem.components

import android.content.res.Configuration
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.tilawah.android.designsystem.AppTheme

/**
 * A pill-shaped outlined chip at the Material 3 height (32dp) for a small
 * setting beside other content, such as the playback speed.
 */
@Composable
fun AppChip(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val colorScheme = AppTheme.colorScheme
    AssistChip(
        onClick = onClick,
        label = { Text(text = label, style = AppTheme.typography.labelLarge) },
        modifier = modifier,
        enabled = enabled,
        shape = CircleShape,
        colors = AssistChipDefaults.assistChipColors(labelColor = colorScheme.onSurfaceVariant),
        border = AssistChipDefaults.assistChipBorder(enabled = enabled, borderColor = colorScheme.outlineVariant),
    )
}

/** Chips in both states, for previews and snapshot tests. */
@Composable
internal fun AppChipSpecimen() {
    Row(horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space2)) {
        AppChip("1×", onClick = {})
        AppChip("0.75×", onClick = {})
        AppChip("1×", onClick = {}, enabled = false)
    }
}

@Preview(name = "Light")
@Preview(name = "Dark", uiMode = Configuration.UI_MODE_NIGHT_YES)
@Composable
private fun AppChipPreview() {
    AppSpecimenSurface { AppChipSpecimen() }
}
