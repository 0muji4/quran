package com.tilawah.android.features.profile

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tilawah.android.R
import com.tilawah.android.designsystem.AppTheme

/**
 * Edit profile, as a Material 3 full-screen dialog on [AppTheme] (ADR 0030):
 * close, the title and Save in the top bar, then the display name and the
 * skill level. Drives `PATCH /auth/me`. Close and system back dismiss without
 * persisting, but do nothing while saving; Save persists, then dismisses on
 * success and stays with the error on failure.
 *
 * [ProfileViewModel] owns the show and hide flag and the ViewModel's lifetime.
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

    // The handler stays enabled while saving: a disabled one passes back to
    // the Activity's default handling, which leaves the app.
    BackHandler {
        if (!state.isSubmitting) onDismiss()
    }

    AppTheme {
        EditProfileScreenContent(
            state = state,
            initialDisplayName = initialDisplayName,
            initialLevel = initialLevel,
            onDisplayNameChange = viewModel::setDisplayName,
            onLevelChange = viewModel::setLevel,
            onSubmit = { viewModel.submit(onSuccess = onDismiss) },
            onCancel = onDismiss,
            modifier = modifier,
        )
    }
}

/** The dialog drawn from its state, so any state renders without a ViewModel. */
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
    val spacing = AppTheme.spacing
    Surface(modifier = modifier.fillMaxSize(), color = AppTheme.colorScheme.surface) {
        Column(modifier = Modifier.fillMaxSize()) {
            EditProfileTopBar(
                canSave = state.canSubmit(initialDisplayName, initialLevel),
                saving = state.isSubmitting,
                onClose = onCancel,
                onSave = onSubmit,
            )
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = spacing.space4)
                    .padding(top = spacing.space2, bottom = spacing.space6),
                verticalArrangement = Arrangement.spacedBy(spacing.space4),
            ) {
                ProfileTextField(
                    label = stringResource(R.string.profile_edit_display_name_label),
                    value = state.displayName,
                    onValueChange = onDisplayNameChange,
                    enabled = !state.isSubmitting,
                    supporting = stringResource(R.string.profile_edit_display_name_helper),
                )
                LevelField(selection = state.level, onSelect = onLevelChange, enabled = !state.isSubmitting)
                (state.status as? EditProfileStatus.Error)?.let { ProfileSheetError(it.message) }
                ElsewhereFooter()
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EditProfileTopBar(canSave: Boolean, saving: Boolean, onClose: () -> Unit, onSave: () -> Unit) {
    TopAppBar(
        title = { Text(text = stringResource(R.string.profile_edit_title)) },
        navigationIcon = {
            IconButton(onClick = onClose, enabled = !saving) {
                Icon(imageVector = Icons.Filled.Close, contentDescription = stringResource(R.string.profile_edit_cancel))
            }
        },
        actions = {
            if (saving) {
                CircularProgressIndicator(
                    modifier = Modifier.padding(horizontal = AppTheme.spacing.space4).size(24.dp),
                    strokeWidth = 2.dp,
                )
            } else {
                TextButton(onClick = onSave, enabled = canSave) {
                    Text(text = stringResource(R.string.profile_edit_save))
                }
            }
        },
    )
}

/** The skill level, chosen from a menu under a read-only outlined field. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LevelField(selection: String?, onSelect: (String) -> Unit, enabled: Boolean) {
    var expanded by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { if (enabled) expanded = it }) {
        OutlinedTextField(
            value = selection?.let { ProfileCopy.levelLabel(it) } ?: "",
            onValueChange = {},
            modifier = Modifier
                .fillMaxWidth()
                .menuAnchor(MenuAnchorType.PrimaryNotEditable, enabled),
            enabled = enabled,
            readOnly = true,
            singleLine = true,
            label = { Text(text = stringResource(R.string.profile_edit_skill_level_label)) },
            placeholder = { Text(text = stringResource(R.string.profile_edit_skill_level_placeholder)) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            EditProfileLevelOptions.forEach { option ->
                DropdownMenuItem(
                    text = { Text(text = ProfileCopy.levelLabel(option)) },
                    onClick = {
                        expanded = false
                        if (option != selection) onSelect(option)
                    },
                    trailingIcon = if (option == selection) {
                        { Icon(imageVector = Icons.Filled.Check, contentDescription = null) }
                    } else {
                        null
                    },
                )
            }
        }
    }
}

/**
 * Where to change everything not edited here. Informational: the dialog is not
 * a navigation host for those sections, so their names are emphasised, not links.
 */
@Composable
private fun ElsewhereFooter() {
    val emphasis = SpanStyle(fontWeight = FontWeight.Medium, color = AppTheme.colorScheme.onSurface)
    Text(
        text = buildAnnotatedString {
            append(stringResource(R.string.profile_edit_footer_lead))
            withStyle(emphasis) { append(stringResource(R.string.profile_edit_footer_account)) }
            append(stringResource(R.string.profile_edit_footer_mid))
            withStyle(emphasis) { append(stringResource(R.string.profile_edit_footer_prefs)) }
            append(stringResource(R.string.profile_edit_footer_end))
        },
        style = AppTheme.typography.bodyMedium,
        color = AppTheme.colorScheme.onSurfaceVariant,
    )
}
