package com.tilawah.android.features.profile

import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tilawah.android.designsystem.AppTheme

/**
 * Update password, as a Material 3 modal bottom sheet on [AppTheme] (ADR 0030).
 * Cancel dismisses without persisting; the confirm button persists, then
 * dismisses on success and stays open with the error on failure. The sheet
 * will not close while saving.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UpdatePasswordSheet(
    viewModel: UpdatePasswordViewModel,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val sheetState = rememberSubmitLockedSheetState(state.isSubmitting)
    AppTheme {
        ModalBottomSheet(
            onDismissRequest = { if (!state.isSubmitting) onDismiss() },
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
}

/** The sheet's content drawn from its state, so any state renders without a ViewModel. */
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
    ProfileSheetBody(title = ProfileCopy.updatePasswordTitle, modifier = modifier) {
        ProfileTextField(
            label = ProfileCopy.updatePasswordCurrentLabel,
            value = state.currentPassword,
            onValueChange = onCurrentPasswordChange,
            enabled = !state.isSubmitting,
            password = true,
        )
        ProfileTextField(
            label = ProfileCopy.updatePasswordNewLabel,
            value = state.newPassword,
            onValueChange = onNewPasswordChange,
            enabled = !state.isSubmitting,
            supporting = ProfileCopy.updatePasswordNewHelper,
            password = true,
        )
        ProfileTextField(
            label = ProfileCopy.updatePasswordConfirmLabel,
            value = state.confirmPassword,
            onValueChange = onConfirmPasswordChange,
            enabled = !state.isSubmitting,
            password = true,
        )
        (state.status as? UpdatePasswordStatus.Error)?.let { ProfileSheetError(it.message) }
        ProfileSheetActions(
            confirmLabel = if (state.isSubmitting) ProfileCopy.updatePasswordSavePending else ProfileCopy.updatePasswordSave,
            confirmEnabled = canSubmit,
            submitting = state.isSubmitting,
            onCancel = onCancel,
            onConfirm = onSubmit,
        )
    }
}
