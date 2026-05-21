package com.tilawah.android.features.profile

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.designsystem.components.PrimaryButton
import com.tilawah.android.features.auth.components.AuthTextField

/**
 * Modal sheet that drives `PATCH /auth/me`. Two fields — display name
 * and skill level — mirror the iOS `EditProfileSheet` and the web
 * `EditProfileButton` modal. Cancel dismisses without persisting; Save
 * persists then dismisses on success, leaving the sheet open with an
 * error banner on failure.
 *
 * Driven by [EditProfileViewModel]; the parent host owns the show /
 * hide flag and the ViewModel lifetime.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditProfileSheet(
    viewModel: EditProfileViewModel,
    initialDisplayName: String,
    initialLevel: String?,
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
        EditProfileSheetContent(
            state = state,
            initialDisplayName = initialDisplayName,
            initialLevel = initialLevel,
            onDisplayNameChange = viewModel::setDisplayName,
            onLevelChange = viewModel::setLevel,
            onSubmit = { viewModel.submit(onSuccess = onDismiss) },
            onCancel = onDismiss,
        )
    }
}

@Composable
internal fun EditProfileSheetContent(
    state: EditProfileUiState,
    initialDisplayName: String,
    initialLevel: String?,
    onDisplayNameChange: (String) -> Unit,
    onLevelChange: (String?) -> Unit,
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
            text = ProfileCopy.editTitle,
            style = BrandTheme.typography.pageTitle,
            color = colors.textPrimary,
        )

        AuthTextField(
            label = ProfileCopy.editDisplayNameLabel,
            value = state.displayName,
            onValueChange = onDisplayNameChange,
            enabled = !state.isSubmitting,
        )

        LevelPicker(
            selection = state.level,
            onSelect = onLevelChange,
            enabled = !state.isSubmitting,
        )

        when (val status = state.status) {
            is EditProfileStatus.Error -> Text(
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
                label = if (state.isSubmitting) ProfileCopy.editSavePending else ProfileCopy.editSave,
                onClick = onSubmit,
                enabled = state.canSubmit(initialDisplayName, initialLevel),
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun LevelPicker(
    selection: String?,
    onSelect: (String?) -> Unit,
    enabled: Boolean,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(spacing.xs)) {
        Text(
            text = ProfileCopy.editLevelLabel,
            style = BrandTheme.typography.eyebrow.copy(fontWeight = FontWeight.SemiBold),
            color = colors.textSecondary,
        )
        EditProfileLevelOptions.forEach { option ->
            val active = option == selection
            Surface(
                shape = RoundedCornerShape(spacing.md),
                color = if (active) colors.primary.copy(alpha = 0.08f) else colors.card,
                border = BorderStroke(
                    width = if (active) 1.5.dp else 1.dp,
                    color = if (active) colors.primary else colors.tile,
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .selectable(
                        selected = active,
                        enabled = enabled,
                        role = Role.RadioButton,
                        onClick = { onSelect(option) },
                    ),
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(spacing.md),
                ) {
                    RadioButton(
                        selected = active,
                        onClick = null,
                        enabled = enabled,
                        colors = RadioButtonDefaults.colors(selectedColor = colors.primary),
                    )
                    Text(
                        text = ProfileCopy.levelLabel(option),
                        style = BrandTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
                        color = colors.textPrimary,
                        modifier = Modifier.padding(start = spacing.sm),
                    )
                }
            }
        }
    }
}
