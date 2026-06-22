package com.tilawah.android.features.profile

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tilawah.android.R
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.designsystem.components.BrandCard
import com.tilawah.android.designsystem.components.BrandCardStyle

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

        // PROFILE: the two editable fields in one grouped card, then a
        // footer pointing at the sibling sections for everything not
        // edited here.
        Column(verticalArrangement = Arrangement.spacedBy(spacing.sm)) {
            Text(
                text = stringResource(R.string.profile_edit_section),
                style = BrandTheme.typography.eyebrow,
                color = colors.textSecondary,
            )
            BrandCard(style = BrandCardStyle.Paper, modifier = Modifier.fillMaxWidth()) {
                Column {
                    DisplayNameRow(
                        value = state.displayName,
                        onValueChange = onDisplayNameChange,
                        enabled = !state.isSubmitting,
                    )
                    EditRowDivider()
                    LevelRow(
                        selection = state.level,
                        onSelect = onLevelChange,
                        enabled = !state.isSubmitting,
                    )
                }
            }
            CrossLinkFooter()
        }

        when (val status = state.status) {
            is EditProfileStatus.Error -> Text(
                text = status.message,
                style = BrandTheme.typography.caption,
                color = colors.recording,
            )
            else -> Unit
        }
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

/** Overline + inline-editable value. Direct editing (rather than a
 *  disclosure to a sub-screen) keeps the single PATCH the ViewModel
 *  already owns as the only write path. */
@Composable
private fun DisplayNameRow(
    value: String,
    onValueChange: (String) -> Unit,
    enabled: Boolean,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = spacing.sm),
        verticalArrangement = Arrangement.spacedBy(spacing.xs),
    ) {
        FieldOverline(stringResource(R.string.profile_edit_display_name_label))
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            enabled = enabled,
            singleLine = true,
            textStyle = BrandTheme.typography.body.copy(color = colors.textPrimary),
            cursorBrush = SolidColor(colors.primary),
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

/** Overline + current value + chevron; tapping opens a dropdown of the
 *  skill levels, matching the mock's collapsed disclosure row. */
@Composable
private fun LevelRow(
    selection: String?,
    onSelect: (String?) -> Unit,
    enabled: Boolean,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    var expanded by remember { mutableStateOf(false) }
    Box(modifier = modifier) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .then(if (enabled) Modifier.clickable { expanded = true } else Modifier)
                .padding(vertical = spacing.sm),
            verticalArrangement = Arrangement.spacedBy(spacing.xs),
        ) {
            FieldOverline(stringResource(R.string.profile_edit_skill_level_label))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = selection?.let { ProfileCopy.levelLabel(it) }
                        ?: stringResource(R.string.profile_edit_skill_level_placeholder),
                    style = BrandTheme.typography.body,
                    color = if (selection != null) colors.textPrimary else colors.textSecondary,
                    modifier = Modifier.weight(1f),
                )
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                    contentDescription = null,
                    tint = colors.textSecondary,
                )
            }
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            EditProfileLevelOptions.forEach { option ->
                DropdownMenuItem(
                    text = { Text(ProfileCopy.levelLabel(option)) },
                    onClick = {
                        expanded = false
                        if (option != selection) onSelect(option)
                    },
                    trailingIcon = if (option == selection) {
                        {
                            Icon(
                                imageVector = Icons.Filled.Check,
                                contentDescription = null,
                                tint = colors.primary,
                            )
                        }
                    } else {
                        null
                    },
                )
            }
        }
    }
}

/**
 * Footer pointing at the sibling Profile sections for everything not
 * edited here. Informational — the destination names are tinted to read
 * as references (the screen isn't a navigation host for them), matching
 * the design.
 */
@Composable
private fun CrossLinkFooter(modifier: Modifier = Modifier) {
    val colors = BrandTheme.colors
    val link = SpanStyle(color = colors.primary, fontWeight = FontWeight.SemiBold)
    val text = buildAnnotatedString {
        append(stringResource(R.string.profile_edit_footer_lead))
        withStyle(link) { append(stringResource(R.string.profile_edit_footer_account)) }
        append(stringResource(R.string.profile_edit_footer_mid))
        withStyle(link) { append(stringResource(R.string.profile_edit_footer_prefs)) }
        append(stringResource(R.string.profile_edit_footer_end))
    }
    Text(
        text = text,
        style = BrandTheme.typography.caption,
        color = colors.textSecondary,
        modifier = modifier,
    )
}

@Composable
private fun FieldOverline(text: String) {
    Text(
        text = text,
        style = BrandTheme.typography.eyebrow.copy(fontWeight = FontWeight.SemiBold),
        color = BrandTheme.colors.textSecondary,
    )
}

@Composable
private fun EditRowDivider() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(1.dp)
            .background(BrandTheme.colors.borderDefault),
    )
}
