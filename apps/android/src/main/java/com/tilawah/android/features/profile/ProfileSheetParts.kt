package com.tilawah.android.features.profile

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.tilawah.android.designsystem.AppTheme

/** The body of a Profile bottom sheet: its title, then [content], spaced as the mockup draws. */
@Composable
internal fun ProfileSheetBody(
    title: String,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = AppTheme.spacing.space6)
            .padding(top = AppTheme.spacing.space2, bottom = AppTheme.spacing.space6),
        verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4),
    ) {
        Text(text = title, style = AppTheme.typography.headlineSmall)
        content()
    }
}

/**
 * A Material 3 outlined text field with its label and supporting text. A
 * [password] field hides its text, with a button to show it.
 */
@Composable
internal fun ProfileTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    enabled: Boolean,
    modifier: Modifier = Modifier,
    supporting: String? = null,
    password: Boolean = false,
    keyboardType: KeyboardType = KeyboardType.Text,
) {
    var visible by rememberSaveable { mutableStateOf(false) }
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        enabled = enabled,
        singleLine = true,
        label = { Text(text = label) },
        supportingText = supporting?.let { { Text(text = it) } },
        visualTransformation = if (password && !visible) PasswordVisualTransformation() else VisualTransformation.None,
        keyboardOptions = KeyboardOptions(keyboardType = if (password) KeyboardType.Password else keyboardType),
        trailingIcon = if (password) {
            {
                IconButton(onClick = { visible = !visible }) {
                    Icon(
                        imageVector = if (visible) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility,
                        contentDescription = if (visible) ProfileCopy.hidePasswordA11y else ProfileCopy.showPasswordA11y,
                    )
                }
            }
        } else {
            null
        },
    )
}

/** A failed save, in the error colour, read out when it appears. */
@Composable
internal fun ProfileSheetError(message: String, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .semantics { liveRegion = LiveRegionMode.Polite },
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space2),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = Icons.Outlined.ErrorOutline,
            contentDescription = null,
            tint = AppTheme.colorScheme.error,
            modifier = Modifier.size(20.dp),
        )
        Text(text = message, style = AppTheme.typography.bodyMedium, color = AppTheme.colorScheme.error)
    }
}

/**
 * Cancel and the confirm button at the end of a sheet. While [submitting], the
 * confirm button shows a spinner and both stay disabled. A [destructive]
 * confirm is red.
 */
@Composable
internal fun ProfileSheetActions(
    confirmLabel: String,
    confirmEnabled: Boolean,
    submitting: Boolean,
    onCancel: () -> Unit,
    onConfirm: () -> Unit,
    destructive: Boolean = false,
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(top = AppTheme.spacing.space2),
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space2, Alignment.End),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        TextButton(onClick = onCancel, enabled = !submitting) {
            Text(text = ProfileCopy.editCancel)
        }
        Button(
            onClick = onConfirm,
            enabled = confirmEnabled,
            colors = if (destructive) {
                ButtonDefaults.buttonColors(
                    containerColor = AppTheme.colorScheme.error,
                    contentColor = AppTheme.colorScheme.onError,
                )
            } else {
                ButtonDefaults.buttonColors()
            },
        ) {
            if (submitting) {
                CircularProgressIndicator(
                    modifier = Modifier.size(18.dp),
                    strokeWidth = 2.dp,
                    color = AppTheme.colorScheme.onSurface,
                )
                Text(text = confirmLabel, modifier = Modifier.padding(start = AppTheme.spacing.space2))
            } else {
                Text(text = confirmLabel)
            }
        }
    }
}
