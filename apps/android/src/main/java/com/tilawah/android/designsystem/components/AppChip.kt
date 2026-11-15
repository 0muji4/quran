package com.tilawah.android.designsystem.components

import android.content.res.Configuration
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.tooling.preview.Preview
import com.tilawah.android.designsystem.AppTheme

/**
 * A Material 3 assist chip at its default shape, size and colours, for a small
 * setting beside other content, such as the playback speed. Pass
 * [trailingIcon] `Icons.Filled.ArrowDropDown` when the chip opens a menu.
 */
@Composable
fun AppChip(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    trailingIcon: ImageVector? = null,
) {
    AssistChip(
        onClick = onClick,
        label = { Text(text = label) },
        modifier = modifier,
        enabled = enabled,
        trailingIcon = trailingIcon?.let { icon ->
            {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    modifier = Modifier.size(AssistChipDefaults.IconSize),
                )
            }
        },
    )
}

/** Chips with and without a trailing icon, in both states, for previews and snapshot tests. */
@Composable
internal fun AppChipSpecimen() {
    Row(horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space2)) {
        AppChip("1×", onClick = {}, trailingIcon = Icons.Filled.ArrowDropDown)
        AppChip("0.75×", onClick = {})
        AppChip("1×", onClick = {}, enabled = false, trailingIcon = Icons.Filled.ArrowDropDown)
    }
}

@Preview(name = "Light")
@Preview(name = "Dark", uiMode = Configuration.UI_MODE_NIGHT_YES)
@Composable
private fun AppChipPreview() {
    AppSpecimenSurface { AppChipSpecimen() }
}
