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
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.designsystem.components.PrimaryButton
import com.tilawah.android.features.auth.components.PasswordField

/**
 * Modal sheet that drives `POST /auth/me/password`. Mirrors iOS
 * `UpdatePasswordSheet` and the web `UpdatePasswordButton`. Cancel
 * dismisses without persisting; Update persists then dismisses on
 * success, leaving the sheet open with an error banner on failure.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UpdatePasswordSheet(
    viewModel: UpdatePasswordViewModel,
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
        UpdatePasswordSheetContent(
            state = state,
            canSubmit = viewModel.canSubmit(),
            onCurrentPasswordChange = viewModel::setCurrentPassword,
            onNewPasswordChange = viewModel::setNewPassword,
            onConfirmPasswordChange = viewModel::setConfirmPassword,
            onSubmit = { viewModel.submit(onSuccess = onDismiss) },
            onCancel = onDismiss,
        )
    }
}

@Composable
internal fun UpdatePasswordSheetContent(
    state: UpdatePasswordUiState,
    canSubmit: Boolean,
    onCurrentPasswordChange: (String) -> Unit,
    onNewPasswordChange: (String) -> Unit,
    onConfirmPasswordChange: (String) -> Unit,
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
            text = ProfileCopy.updatePasswordTitle,
            style = BrandTheme.typography.pageTitle,
            color = colors.textPrimary,
        )

        PasswordField(
            label = ProfileCopy.updatePasswordCurrentLabel,
            value = state.currentPassword,
            onValueChange = onCurrentPasswordChange,
            enabled = !state.isSubmitting,
        )

        PasswordField(
            label = ProfileCopy.updatePasswordNewLabel,
            value = state.newPassword,
            onValueChange = onNewPasswordChange,
            enabled = !state.isSubmitting,
            helperText = ProfileCopy.updatePasswordNewHelper,
        )

        PasswordField(
            label = ProfileCopy.updatePasswordConfirmLabel,
            value = state.confirmPassword,
            onValueChange = onConfirmPasswordChange,
            enabled = !state.isSubmitting,
        )

        when (val status = state.status) {
            is UpdatePasswordStatus.Error -> Text(
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
                label = if (state.isSubmitting) ProfileCopy.updatePasswordSavePending else ProfileCopy.updatePasswordSave,
                onClick = onSubmit,
                enabled = canSubmit,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
