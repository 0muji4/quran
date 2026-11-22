package com.tilawah.android.features.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.tilawah.android.R
import com.tilawah.android.app.AppError
import com.tilawah.android.designsystem.AppTheme

// The pieces the sign-in and create-account screens share, on AppTheme and
// Material 3 components (ADR 0030).

/**
 * The frame of an auth screen: a top app bar with back and the [title], then
 * the form, which scrolls. Back is disabled while a request is in flight.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun AuthScaffold(
    title: String,
    onBack: () -> Unit,
    backEnabled: Boolean,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    val spacing = AppTheme.spacing
    Surface(modifier = modifier.fillMaxSize(), color = AppTheme.colorScheme.surface) {
        Column(modifier = Modifier.fillMaxSize()) {
            TopAppBar(
                title = { Text(text = title) },
                navigationIcon = {
                    IconButton(onClick = onBack, enabled = backEnabled) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.auth_back),
                        )
                    }
                },
            )
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = spacing.space4)
                    .padding(top = spacing.space2, bottom = spacing.space6),
                verticalArrangement = Arrangement.spacedBy(spacing.space5),
                content = content,
            )
        }
    }
}

/** The line under the top app bar that says what the screen is for. */
@Composable
internal fun AuthLede(text: String) {
    Text(text = text, style = AppTheme.typography.bodyLarge, color = AppTheme.colorScheme.onSurfaceVariant)
}

/**
 * A Material 3 outlined text field with its label and supporting text. A
 * [password] field hides its text, with a button to show it.
 */
@Composable
internal fun AuthTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    enabled: Boolean,
    modifier: Modifier = Modifier,
    supporting: String? = null,
    password: Boolean = false,
    keyboardType: KeyboardType = KeyboardType.Text,
    capitalization: KeyboardCapitalization = KeyboardCapitalization.None,
) {
    var visible by rememberSaveable { mutableStateOf(false) }
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        enabled = enabled,
        singleLine = true,
        label = { Text(text = label) },
        supportingText = supporting?.let { { Text(text = it) } },
        visualTransformation = if (password && !visible) PasswordVisualTransformation() else VisualTransformation.None,
        keyboardOptions = KeyboardOptions(
            capitalization = capitalization,
            keyboardType = if (password) KeyboardType.Password else keyboardType,
        ),
        trailingIcon = if (password) {
            {
                IconButton(onClick = { visible = !visible }, enabled = enabled) {
                    Icon(
                        imageVector = if (visible) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility,
                        contentDescription = stringResource(
                            if (visible) R.string.auth_hide_password else R.string.auth_show_password,
                        ),
                    )
                }
            }
        } else {
            null
        },
    )
}

/** A failed sign-in or sign-up and what to do next, in the error colour, read out when it appears. */
@Composable
internal fun AuthError(error: AppError, modifier: Modifier = Modifier) {
    val color = AppTheme.colorScheme.error
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = AppTheme.spacing.space1)
            .semantics(mergeDescendants = true) { liveRegion = LiveRegionMode.Polite },
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space3),
    ) {
        Icon(
            imageVector = Icons.Outlined.ErrorOutline,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(20.dp),
        )
        Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space1)) {
            Text(
                text = stringResource(error.titleRes),
                style = AppTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                color = color,
            )
            Text(text = stringResource(error.recoveryRes), style = AppTheme.typography.bodyMedium, color = color)
        }
    }
}

/**
 * The full-width submit button. While [pending], it shows a spinner and
 * [pendingLabel], and stays disabled.
 */
@Composable
internal fun AuthSubmitButton(
    label: String,
    pendingLabel: String,
    pending: Boolean,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    Button(onClick = onClick, enabled = enabled && !pending, modifier = Modifier.fillMaxWidth()) {
        if (pending) {
            CircularProgressIndicator(
                modifier = Modifier.size(18.dp),
                strokeWidth = 2.dp,
                color = LocalContentColor.current,
            )
            Text(text = pendingLabel, modifier = Modifier.padding(start = AppTheme.spacing.space2))
        } else {
            Text(text = label)
        }
    }
}

/** "or" between the email form and the other ways to sign in. */
@Composable
internal fun AuthOrDivider() {
    Row(verticalAlignment = Alignment.CenterVertically) {
        HorizontalDivider(modifier = Modifier.weight(1f), color = AppTheme.colorScheme.outlineVariant)
        Text(
            text = stringResource(R.string.auth_or),
            style = AppTheme.typography.bodyMedium,
            color = AppTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = AppTheme.spacing.space3),
        )
        HorizontalDivider(modifier = Modifier.weight(1f), color = AppTheme.colorScheme.outlineVariant)
    }
}

/**
 * Continue with Google, enabled when the app is configured for it
 * ([onGoogle] is not null) and nothing is in flight, and Continue with Apple,
 * which is not built yet and stays disabled.
 */
@Composable
internal fun AuthProviderButtons(onGoogle: (() -> Unit)?, enabled: Boolean) {
    val colors = ButtonDefaults.outlinedButtonColors(contentColor = AppTheme.colorScheme.onSurface)
    Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space3)) {
        val googleEnabled = onGoogle != null && enabled
        OutlinedButton(
            onClick = { onGoogle?.invoke() },
            enabled = googleEnabled,
            modifier = Modifier.fillMaxWidth(),
            colors = colors,
        ) {
            Image(
                painter = painterResource(R.drawable.ic_google),
                contentDescription = null,
                modifier = Modifier.size(18.dp).alpha(if (googleEnabled) 1f else DISABLED_ALPHA),
            )
            Text(
                text = stringResource(R.string.auth_continue_google),
                modifier = Modifier.padding(start = AppTheme.spacing.space3),
            )
        }
        OutlinedButton(onClick = {}, enabled = false, modifier = Modifier.fillMaxWidth(), colors = colors) {
            Icon(
                painter = painterResource(R.drawable.ic_apple),
                contentDescription = null,
                modifier = Modifier.size(18.dp),
            )
            Text(
                text = stringResource(R.string.auth_continue_apple),
                modifier = Modifier.padding(start = AppTheme.spacing.space3),
            )
        }
    }
}

/** The way across to the other auth screen: a prompt and a text button. */
@Composable
internal fun AuthFooter(prompt: String, action: String, onAction: () -> Unit, enabled: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(text = prompt, style = AppTheme.typography.bodyMedium, color = AppTheme.colorScheme.onSurfaceVariant)
        TextButton(onClick = onAction, enabled = enabled) {
            Text(text = action)
        }
    }
}

/** The self-declared level, as radio list items on a filled card, with a note that it can change later. */
@Composable
internal fun AuthLevelSection(selection: Level, onSelect: (Level) -> Unit, enabled: Boolean) {
    val spacing = AppTheme.spacing
    val container = AppTheme.colorScheme.surfaceContainerHighest
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space2)) {
        Text(
            text = stringResource(R.string.auth_level_title),
            style = AppTheme.typography.titleSmall,
            color = AppTheme.colorScheme.primary,
            modifier = Modifier.padding(horizontal = spacing.space1),
        )
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = container),
        ) {
            Column(modifier = Modifier.selectableGroup()) {
                LevelOptions.forEach { option ->
                    val selected = option.level == selection
                    ListItem(
                        modifier = Modifier.selectable(
                            selected = selected,
                            enabled = enabled,
                            role = Role.RadioButton,
                            onClick = { onSelect(option.level) },
                        ),
                        headlineContent = { Text(text = option.level.label) },
                        supportingContent = { Text(text = option.level.description) },
                        leadingContent = { RadioButton(selected = selected, onClick = null, enabled = enabled) },
                        colors = ListItemDefaults.colors(containerColor = container),
                    )
                }
            }
        }
        Text(
            text = stringResource(R.string.auth_level_helper),
            style = AppTheme.typography.bodySmall,
            color = AppTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = spacing.space1),
        )
    }
}

/**
 * The terms checkbox. When the terms were not accepted on submit ([error]),
 * the box and its label turn the error colour and the reason shows under them.
 */
@Composable
internal fun AuthTermsRow(checked: Boolean, onCheckedChange: (Boolean) -> Unit, enabled: Boolean, error: Boolean) {
    val spacing = AppTheme.spacing
    val errorColor = AppTheme.colorScheme.error
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space1)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 48.dp)
                .toggleable(value = checked, enabled = enabled, role = Role.Checkbox, onValueChange = onCheckedChange),
            horizontalArrangement = Arrangement.spacedBy(spacing.space2),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Checkbox(
                checked = checked,
                onCheckedChange = null,
                enabled = enabled,
                modifier = Modifier.padding(horizontal = spacing.space3),
                colors = if (error) CheckboxDefaults.colors(uncheckedColor = errorColor) else CheckboxDefaults.colors(),
            )
            Text(
                text = stringResource(R.string.auth_terms),
                style = AppTheme.typography.bodyMedium,
                color = if (error) errorColor else AppTheme.colorScheme.onSurface,
            )
        }
        if (error) {
            Text(
                text = stringResource(R.string.auth_terms_error),
                style = AppTheme.typography.bodySmall,
                color = errorColor,
                modifier = Modifier
                    .padding(horizontal = spacing.space1)
                    .semantics { liveRegion = LiveRegionMode.Polite },
            )
        }
    }
}

/** Material's opacity for disabled content, for the Google logo, which is drawn in its own colours. */
private const val DISABLED_ALPHA = 0.38f
