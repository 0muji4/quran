package com.tilawah.android.features.profile

import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tilawah.android.designsystem.AppTheme

/**
 * Change email, as a Material 3 modal bottom sheet on [AppTheme] (ADR 0030).
 * Drives `POST /auth/me/email`. Cancel dismisses without persisting; the
 * confirm button persists, then dismisses on success and stays open with the
 * error on failure. The sheet will not close while saving.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChangeEmailSheet(
    viewModel: ChangeEmailViewModel,
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
}

/** The sheet's content drawn from its state, so any state renders without a ViewModel. */
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
    ProfileSheetBody(title = ProfileCopy.changeEmailTitle, modifier = modifier) {
        ProfileTextField(
            label = ProfileCopy.changeEmailNewLabel,
            value = state.newEmail,
            onValueChange = onNewEmailChange,
            enabled = !state.isSubmitting,
            supporting = ProfileCopy.changeEmailNewHelper,
            keyboardType = KeyboardType.Email,
        )
        ProfileTextField(
            label = ProfileCopy.changeEmailCurrentPasswordLabel,
            value = state.currentPassword,
            onValueChange = onCurrentPasswordChange,
            enabled = !state.isSubmitting,
            supporting = ProfileCopy.changeEmailCurrentPasswordHelper,
            password = true,
        )
        (state.status as? ChangeEmailStatus.Error)?.let { ProfileSheetError(it.message) }
        ProfileSheetActions(
            confirmLabel = if (state.isSubmitting) ProfileCopy.changeEmailSavePending else ProfileCopy.changeEmailSave,
            confirmEnabled = canSubmit,
            submitting = state.isSubmitting,
            onCancel = onCancel,
            onConfirm = onSubmit,
        )
    }
}
