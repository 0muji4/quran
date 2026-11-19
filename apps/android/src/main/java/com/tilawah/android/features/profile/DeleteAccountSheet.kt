package com.tilawah.android.features.profile

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.WarningAmber
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tilawah.android.designsystem.AppTheme

/**
 * Delete account, as a Material 3 modal bottom sheet on [AppTheme] (ADR 0030).
 * It leads with what deleting does, on the error container, and asks for
 * DELETE before its red confirm button enables. The sheet will not close
 * while deleting.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeleteAccountSheet(
    viewModel: DeleteAccountViewModel,
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
            DeleteAccountSheetContent(
                state = state,
                canSubmit = viewModel.canSubmit(),
                onConfirmTextChange = viewModel::setConfirmText,
                onSubmit = { viewModel.submit(onSuccess = onDismiss) },
                onCancel = onDismiss,
            )
        }
    }
}

/** The sheet's content drawn from its state, so any state renders without a ViewModel. */
@Composable
internal fun DeleteAccountSheetContent(
    state: DeleteAccountUiState,
    canSubmit: Boolean,
    onConfirmTextChange: (String) -> Unit,
    onSubmit: () -> Unit,
    onCancel: () -> Unit,
    modifier: Modifier = Modifier,
) {
    ProfileSheetBody(title = ProfileCopy.deleteAccountTitle, modifier = modifier) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = AppTheme.colorScheme.errorContainer,
                contentColor = AppTheme.colorScheme.onErrorContainer,
            ),
        ) {
            Row(
                modifier = Modifier.padding(AppTheme.spacing.space4),
                horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space3),
            ) {
                Icon(imageVector = Icons.Outlined.WarningAmber, contentDescription = null)
                Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space1)) {
                    Text(text = ProfileCopy.deleteAccountWarningTitle, style = AppTheme.typography.titleMedium)
                    Text(text = ProfileCopy.deleteAccountBody, style = AppTheme.typography.bodyMedium)
                }
            }
        }
        ProfileTextField(
            label = ProfileCopy.deleteAccountConfirmLabel,
            value = state.confirmText,
            onValueChange = onConfirmTextChange,
            enabled = !state.isSubmitting,
            supporting = ProfileCopy.deleteAccountConfirmHelper,
        )
        (state.status as? DeleteAccountStatus.Error)?.let { ProfileSheetError(it.message) }
        ProfileSheetActions(
            confirmLabel = if (state.isSubmitting) ProfileCopy.deleteAccountSavePending else ProfileCopy.deleteAccountSave,
            confirmEnabled = canSubmit,
            submitting = state.isSubmitting,
            onCancel = onCancel,
            onConfirm = onSubmit,
            destructive = true,
        )
    }
}
