package com.tilawah.android.features.profile

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.designsystem.components.PrimaryButton
import com.tilawah.android.features.auth.components.AuthTextField
import com.tilawah.android.features.auth.components.PasswordField

/**
 * Modal sheet that drives `POST /auth/me/email`. Mirrors iOS
 * `ChangeEmailSheet` and the web `ChangeEmailButton` modal. Cancel
 * dismisses without persisting; Save persists then dismisses on
 * success, leaving the sheet open with an error banner on failure.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChangeEmailSheet(
    viewModel: ChangeEmailViewModel,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = {
            if (!state.isSubmitting) onDismiss()
        },
        sheetState = sheetState,
        modifier = modifier,
    ) {
        ChangeEmailSheetContent(
            state = state,
            canSubmit = viewModel.canSubmit(),
            onCurrentPasswordChange = viewModel::setCurrentPassword,
            onNewEmailChange = viewModel::setNewEmail,
            onSubmit = { viewModel.submit(onSuccess = onDismiss) },
            onCancel = onDismiss,
        )
    }
}

@Composable
internal fun ChangeEmailSheetContent(
    state: ChangeEmailUiState,
    canSubmit: Boolean,
    onCurrentPasswordChange: (String) -> Unit,
    onNewEmailChange: (String) -> Unit,
    onSubmit: () -> Unit,
    onCancel: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = spacing.screenHorizontal, vertical = spacing.lg),
        verticalArrangement = Arrangement.spacedBy(spacing.lg),
    ) {
        Text(
            text = ProfileCopy.changeEmailTitle,
            style = BrandTheme.typography.pageTitle,
            color = colors.textPrimary,
        )

        AuthTextField(
            label = ProfileCopy.changeEmailNewLabel,
            value = state.newEmail,
            onValueChange = onNewEmailChange,
            keyboardType = KeyboardType.Email,
            enabled = !state.isSubmitting,
        )

        PasswordField(
            label = ProfileCopy.changeEmailCurrentPasswordLabel,
            value = state.currentPassword,
            onValueChange = onCurrentPasswordChange,
            enabled = !state.isSubmitting,
            helperText = ProfileCopy.changeEmailCurrentPasswordHelper,
        )

        when (val status = state.status) {
            is ChangeEmailStatus.Error -> Text(
                text = status.message,
                style = BrandTheme.typography.caption,
                color = colors.recording,
            )
            else -> Unit
        }

        Row(
            horizontalArrangement = Arrangement.spacedBy(spacing.md),
            modifier = Modifier.fillMaxWidth(),
        ) {
            TextButton(
                onClick = onCancel,
                enabled = !state.isSubmitting,
            ) {
                Text(text = ProfileCopy.editCancel, color = colors.textSecondary)
            }
            PrimaryButton(
                label = if (state.isSubmitting) ProfileCopy.changeEmailSavePending else ProfileCopy.changeEmailSave,
                onClick = onSubmit,
                enabled = canSubmit,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
