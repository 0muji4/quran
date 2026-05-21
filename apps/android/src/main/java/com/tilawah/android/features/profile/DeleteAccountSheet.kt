package com.tilawah.android.features.profile

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ButtonDefaults
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
import com.tilawah.android.designsystem.components.PrimaryButtonTint
import com.tilawah.android.features.auth.components.AuthTextField

/**
 * Destructive confirmation sheet for `DELETE /auth/me`. Mirrors iOS
 * `DeleteAccountSheet` — the user must type `DELETE` to enable the
 * destructive button. Soft-deletes per ADR-0024 §4 with a 30-day
 * grace window for reactivation via sign-in.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeleteAccountSheet(
    viewModel: DeleteAccountViewModel,
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
        DeleteAccountSheetContent(
            state = state,
            canSubmit = viewModel.canSubmit(),
            onConfirmTextChange = viewModel::setConfirmText,
            onSubmit = { viewModel.submit(onSuccess = onDismiss) },
            onCancel = onDismiss,
        )
    }
}

@Composable
internal fun DeleteAccountSheetContent(
    state: DeleteAccountUiState,
    canSubmit: Boolean,
    onConfirmTextChange: (String) -> Unit,
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
            text = ProfileCopy.deleteAccountTitle,
            style = BrandTheme.typography.pageTitle,
            color = colors.textPrimary,
        )
        Text(
            text = ProfileCopy.deleteAccountBody,
            style = BrandTheme.typography.body,
            color = colors.textSecondary,
        )

        AuthTextField(
            label = ProfileCopy.deleteAccountConfirmLabel,
            value = state.confirmText,
            onValueChange = onConfirmTextChange,
            enabled = !state.isSubmitting,
        )

        when (val status = state.status) {
            is DeleteAccountStatus.Error -> Text(
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
                colors = ButtonDefaults.textButtonColors(),
            ) {
                Text(text = ProfileCopy.editCancel, color = colors.textSecondary)
            }
            PrimaryButton(
                label = if (state.isSubmitting) ProfileCopy.deleteAccountSavePending else ProfileCopy.deleteAccountSave,
                onClick = onSubmit,
                enabled = canSubmit,
                tint = PrimaryButtonTint.Accent,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
