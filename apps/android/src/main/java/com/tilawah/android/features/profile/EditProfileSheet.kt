package com.tilawah.android.features.profile

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material3.Icon
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tilawah.android.R
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.features.auth.components.AuthTextField

/**
 * Edit Profile, presented as a FULL-SCREEN view (not a modal sheet) to
 * match `docs/design/Android _ Edit profile.png`. Drives `PATCH /auth/me`
 * with two editable fields — display name and skill level. Cancel / back
 * dismisses without persisting; Save persists then dismisses on success,
 * staying on-screen with an error message on failure.
 *
 * The entry composable name and `(viewModel, initialDisplayName,
 * initialLevel, onDismiss, modifier)` signature are unchanged from the
 * previous modal version, so the host (`ProfileAuthHost`) needs no edit —
 * only the internal presentation changed from `ModalBottomSheet` to a
 * full-bleed [Surface].
 *
 * Driven by [EditProfileViewModel]; the parent host owns the show /
 * hide flag and the ViewModel lifetime.
 */
@Composable
fun EditProfileSheet(
    viewModel: EditProfileViewModel,
    initialDisplayName: String,
    initialLevel: String?,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    // System back behaves like Cancel, but is suppressed mid-save so a
    // half-applied PATCH can't leave the host in an inconsistent state.
    BackHandler(enabled = !state.isSubmitting, onBack = onDismiss)

    Surface(
        color = BrandTheme.colors.surface,
        modifier = modifier.fillMaxSize(),
    ) {
        EditProfileScreenContent(
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
internal fun EditProfileScreenContent(
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
    val canSubmit = state.canSubmit(initialDisplayName, initialLevel)
    // Monogram tracks the live field, not the initial value, so the
    // avatar updates as the user types.
    val avatarName = state.displayName.takeIf { it.isNotBlank() } ?: initialDisplayName

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = spacing.screenHorizontal, vertical = spacing.lg),
        verticalArrangement = Arrangement.spacedBy(spacing.lg),
    ) {
        EditProfileNavBar(
            onCancel = onCancel,
            onSave = onSubmit,
            saveEnabled = canSubmit,
            saving = state.isSubmitting,
        )

        // Centered avatar + "Change photo" link.
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(spacing.sm),
        ) {
            GradientAvatar(name = avatarName, size = 96.dp, monogramFontSize = 36)
            // TODO(profile): no photo upload backend yet — link is inert.
            TextButton(onClick = {}, enabled = !state.isSubmitting) {
                Text(
                    text = stringResource(R.string.profile_edit_change_photo),
                    color = colors.primary,
                    style = BrandTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
                )
            }
        }

        Text(
            text = stringResource(R.string.profile_edit_section),
            style = BrandTheme.typography.eyebrow,
            color = colors.textSecondary,
        )

        AuthTextField(
            label = stringResource(R.string.profile_edit_display_name_label),
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

        Text(
            text = stringResource(R.string.profile_edit_footer_hint),
            style = BrandTheme.typography.caption,
            color = colors.textSecondary,
        )
    }
}

@Composable
private fun EditProfileNavBar(
    onCancel: () -> Unit,
    onSave: () -> Unit,
    saveEnabled: Boolean,
    saving: Boolean,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        TextButton(
            onClick = onCancel,
            enabled = !saving,
            contentPadding = androidx.compose.foundation.layout.PaddingValues(0.dp),
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                contentDescription = null,
                tint = colors.textSecondary,
            )
            Text(
                text = stringResource(R.string.profile_edit_cancel),
                color = colors.textSecondary,
                style = BrandTheme.typography.body,
            )
        }
        Text(
            text = stringResource(R.string.profile_edit_title),
            style = BrandTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
            color = colors.textPrimary,
            textAlign = TextAlign.Center,
            modifier = Modifier.weight(1f),
        )
        TextButton(
            onClick = onSave,
            enabled = saveEnabled,
            contentPadding = androidx.compose.foundation.layout.PaddingValues(0.dp),
        ) {
            Text(
                text = if (saving) {
                    stringResource(R.string.profile_edit_saving)
                } else {
                    stringResource(R.string.profile_edit_save)
                },
                color = if (saveEnabled) colors.primary else colors.textSecondary,
                style = BrandTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
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
            text = stringResource(R.string.profile_edit_skill_level_label),
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
