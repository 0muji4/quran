package com.tilawah.android.designsystem.components

import android.content.res.Configuration
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Button
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.FloatingActionButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LargeFloatingActionButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.tooling.preview.Preview
import com.tilawah.android.designsystem.AppTheme

/** The Material 3 button an [AppButton] draws (ADR 0030). */
enum class AppButtonVariant {
    /** A filled button: the main action of a panel, such as "See details". */
    Filled,

    /** An outlined button: a second action beside a [Filled] one, such as "Record again". */
    Outlined,

    /** A text button: a low-emphasis action, such as "Show translation". */
    Text,
}

/**
 * A Material 3 text button at its default shape, size and colours. Pass
 * `Modifier.weight(1f)` to share a row with another button.
 */
@Composable
fun AppButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: AppButtonVariant = AppButtonVariant.Filled,
    enabled: Boolean = true,
) {
    val label: @Composable RowScope.() -> Unit = { Text(text = text) }
    when (variant) {
        AppButtonVariant.Filled -> Button(onClick = onClick, modifier = modifier, enabled = enabled, content = label)
        AppButtonVariant.Outlined ->
            OutlinedButton(onClick = onClick, modifier = modifier, enabled = enabled, content = label)
        AppButtonVariant.Text -> TextButton(onClick = onClick, modifier = modifier, enabled = enabled, content = label)
    }
}

/**
 * The button that starts and stops a recording: a Material 3 large FAB. While
 * [recording], it shows a stop icon on the error container, the container
 * role that pairs with the recording colour.
 */
@Composable
fun AppRecordButton(
    recording: Boolean,
    onClick: () -> Unit,
    contentDescription: String,
    modifier: Modifier = Modifier,
) {
    val colorScheme = AppTheme.colorScheme
    LargeFloatingActionButton(
        onClick = onClick,
        modifier = modifier,
        containerColor = if (recording) colorScheme.errorContainer else colorScheme.primaryContainer,
        contentColor = if (recording) colorScheme.onErrorContainer else colorScheme.onPrimaryContainer,
    ) {
        // The large FAB does not size its icon; Material 3 gives it 36dp.
        Icon(
            imageVector = if (recording) Icons.Filled.Stop else Icons.Filled.Mic,
            contentDescription = contentDescription,
            modifier = Modifier.size(FloatingActionButtonDefaults.LargeIconSize),
        )
    }
}

/** A Material 3 filled tonal icon button, such as the teacher recitation's play button. */
@Composable
fun AppTonalIconButton(
    icon: ImageVector,
    contentDescription: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    FilledTonalIconButton(onClick = onClick, modifier = modifier, enabled = enabled) {
        Icon(imageVector = icon, contentDescription = contentDescription)
    }
}

/** Every button variant and state, for previews and snapshot tests. */
@Composable
internal fun AppButtonsSpecimen() {
    val spacing = AppTheme.spacing
    listOf(
        AppButtonVariant.Filled to "Details",
        AppButtonVariant.Outlined to "Again",
        AppButtonVariant.Text to "Translation",
    ).forEach { (variant, text) ->
        Row(horizontalArrangement = Arrangement.spacedBy(spacing.space2)) {
            AppButton(text, onClick = {}, variant = variant)
            AppButton(text, onClick = {}, variant = variant, enabled = false)
        }
    }
    Row(horizontalArrangement = Arrangement.spacedBy(spacing.space2)) {
        AppButton("Record again", onClick = {}, modifier = Modifier.weight(1f), variant = AppButtonVariant.Outlined)
        AppButton("See details", onClick = {}, modifier = Modifier.weight(1f), variant = AppButtonVariant.Filled)
    }
    AppPanel(tone = AppPanelTone.Error) {
        Row(horizontalArrangement = Arrangement.spacedBy(spacing.space2)) {
            AppButton("Play mine", onClick = {}, variant = AppButtonVariant.Text)
            AppButton("Record again", onClick = {}, variant = AppButtonVariant.Filled)
        }
    }
    Row(
        horizontalArrangement = Arrangement.spacedBy(spacing.space4),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AppRecordButton(recording = false, onClick = {}, contentDescription = "Start recording")
        AppRecordButton(recording = true, onClick = {}, contentDescription = "Stop recording")
        AppTonalIconButton(icon = Icons.Filled.PlayArrow, contentDescription = "Play", onClick = {})
        AppTonalIconButton(icon = Icons.Filled.PlayArrow, contentDescription = "Play", onClick = {}, enabled = false)
    }
}

@Preview(name = "Light")
@Preview(name = "Dark", uiMode = Configuration.UI_MODE_NIGHT_YES)
@Composable
private fun AppButtonsPreview() {
    AppSpecimenSurface { AppButtonsSpecimen() }
}
