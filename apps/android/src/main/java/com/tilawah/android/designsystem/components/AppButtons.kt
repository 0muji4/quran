package com.tilawah.android.designsystem.components

import android.content.res.Configuration
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.tilawah.android.designsystem.AppTheme

/** The look of an [AppButton]. */
enum class AppButtonVariant {
    /** The main action of a panel, such as "See details". */
    Filled,

    /** A second action beside a [Filled] one, such as "Record again". */
    Outlined,

    /** A low-emphasis action, such as "Show translation". */
    Text,

    /** The main action on an error panel ([AppPanelTone.Error]). */
    ErrorFilled,

    /** A low-emphasis action on an error panel ([AppPanelTone.Error]). */
    ErrorText,
}

/**
 * A pill-shaped text button at the Material 3 height (40dp). Pass
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
    val colorScheme = AppTheme.colorScheme
    val label: @Composable RowScope.() -> Unit = {
        Text(text = text, style = AppTheme.typography.labelLarge)
    }
    when (variant) {
        AppButtonVariant.Filled -> Button(
            onClick = onClick,
            modifier = modifier,
            enabled = enabled,
            shape = CircleShape,
            content = label,
        )
        AppButtonVariant.Outlined -> OutlinedButton(
            onClick = onClick,
            modifier = modifier,
            enabled = enabled,
            shape = CircleShape,
            colors = ButtonDefaults.outlinedButtonColors(contentColor = colorScheme.primary),
            border = BorderStroke(
                width = 1.dp,
                color = if (enabled) colorScheme.outline else colorScheme.onSurface.copy(alpha = DISABLED_BORDER_ALPHA),
            ),
            content = label,
        )
        AppButtonVariant.Text -> TextButton(
            onClick = onClick,
            modifier = modifier,
            enabled = enabled,
            shape = CircleShape,
            content = label,
        )
        AppButtonVariant.ErrorFilled -> Button(
            onClick = onClick,
            modifier = modifier,
            enabled = enabled,
            shape = CircleShape,
            colors = ButtonDefaults.buttonColors(
                containerColor = colorScheme.error,
                contentColor = colorScheme.onError,
            ),
            content = label,
        )
        AppButtonVariant.ErrorText -> TextButton(
            onClick = onClick,
            modifier = modifier,
            enabled = enabled,
            shape = CircleShape,
            colors = ButtonDefaults.textButtonColors(contentColor = colorScheme.onErrorContainer),
            content = label,
        )
    }
}

/**
 * The 88dp round button that starts and stops a recording. While
 * [recording], it shows a stop square on the recording colour inside a ring.
 */
@Composable
fun AppRecordButton(
    recording: Boolean,
    onClick: () -> Unit,
    contentDescription: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val colorScheme = AppTheme.colorScheme
    val appColors = AppTheme.appColors
    Surface(
        onClick = onClick,
        modifier = modifier
            .size(RECORD_BUTTON_SIZE)
            .semantics { role = Role.Button },
        enabled = enabled,
        shape = CircleShape,
        color = when {
            !enabled -> colorScheme.onSurface.copy(alpha = DISABLED_CONTAINER_ALPHA)
            recording -> appColors.recording
            else -> colorScheme.primary
        },
        contentColor = when {
            !enabled -> colorScheme.onSurface.copy(alpha = DISABLED_CONTENT_ALPHA)
            recording -> appColors.onRecording
            else -> colorScheme.onPrimary
        },
        // The ring has the same light and dark values as errorContainer, the
        // container role that pairs with the recording colour.
        border = if (recording && enabled) BorderStroke(RECORD_RING_WIDTH, colorScheme.errorContainer) else null,
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(
                imageVector = if (recording) Icons.Filled.Stop else Icons.Filled.Mic,
                contentDescription = contentDescription,
                modifier = Modifier.size(if (recording) STOP_ICON_SIZE else MIC_ICON_SIZE),
            )
        }
    }
}

/** A 48dp round icon button on the secondary container, such as the teacher recitation's play button. */
@Composable
fun AppTonalIconButton(
    icon: ImageVector,
    contentDescription: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    FilledTonalIconButton(
        onClick = onClick,
        modifier = modifier.size(TONAL_ICON_BUTTON_SIZE),
        enabled = enabled,
        shape = CircleShape,
    ) {
        Icon(imageVector = icon, contentDescription = contentDescription, modifier = Modifier.size(TONAL_ICON_SIZE))
    }
}

// The Material 3 disabled opacities.
private const val DISABLED_BORDER_ALPHA = 0.12f
private const val DISABLED_CONTAINER_ALPHA = 0.12f
private const val DISABLED_CONTENT_ALPHA = 0.38f
private val RECORD_BUTTON_SIZE = 88.dp
private val RECORD_RING_WIDTH = 6.dp
private val MIC_ICON_SIZE = 34.dp
private val STOP_ICON_SIZE = 28.dp
private val TONAL_ICON_BUTTON_SIZE = 48.dp
private val TONAL_ICON_SIZE = 22.dp

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
            AppButton("Play mine", onClick = {}, variant = AppButtonVariant.ErrorText)
            AppButton("Record again", onClick = {}, variant = AppButtonVariant.ErrorFilled)
        }
    }
    Row(
        horizontalArrangement = Arrangement.spacedBy(spacing.space4),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AppRecordButton(recording = false, onClick = {}, contentDescription = "Start recording")
        AppRecordButton(recording = true, onClick = {}, contentDescription = "Stop recording")
        AppRecordButton(recording = false, onClick = {}, contentDescription = "Start recording", enabled = false)
        AppTonalIconButton(icon = Icons.Filled.PlayArrow, contentDescription = "Play", onClick = {})
    }
}

@Preview(name = "Light")
@Preview(name = "Dark", uiMode = Configuration.UI_MODE_NIGHT_YES)
@Composable
private fun AppButtonsPreview() {
    AppSpecimenSurface { AppButtonsSpecimen() }
}
