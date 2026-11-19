package com.tilawah.android.features.profile

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.LocalFireDepartment
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tilawah.android.R
import com.tilawah.android.backend.PracticePreferences
import com.tilawah.android.designsystem.AppTheme
import com.tilawah.android.designsystem.components.AppButton
import com.tilawah.android.designsystem.components.AppButtonVariant
import com.tilawah.android.designsystem.components.AppCard
import com.tilawah.android.storage.StoredAuthUser
import com.tilawah.android.storage.StoredSession
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * The Profile tab, on [AppTheme] (ADR 0026) and Material 3 components
 * (ADR 0030). The agreed mockup is the Profile page of the canvas linked
 * from #596. Signed out, it welcomes the user with Sign in and Create an
 * account; signed in, it shows the profile, the practice preferences, the
 * account, and Sign out and Delete account.
 *
 * Navigation between the auth screens and the sheets is the caller's
 * (`ProfileAuthHost`). Practice preferences persist through
 * [PreferencesViewModel].
 */
@Composable
fun ProfileScreen(
    session: StoredSession?,
    onSignInTapped: () -> Unit,
    onSignUpTapped: () -> Unit,
    onSignOutTapped: () -> Unit,
    onEditProfileTapped: () -> Unit,
    onChangeEmailTapped: () -> Unit,
    onUpdatePasswordTapped: () -> Unit,
    onDeleteAccountTapped: () -> Unit,
    // Required whenever [session] is non-null; the signed-out shell never
    // touches it. Defaulted so the signed-out call sites stay terse.
    preferencesViewModel: PreferencesViewModel? = null,
    streakDays: Int = 0,
    showReactivationBanner: Boolean = false,
    onAcknowledgeReactivation: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    val preferencesState = preferencesViewModel?.state?.collectAsStateWithLifecycle()?.value
    // Resolve the stored row when the tab first appears; the ViewModel no-ops
    // on repeat calls, and a failed load degrades to the rendered defaults.
    LaunchedEffect(preferencesViewModel) { preferencesViewModel?.load() }

    AppTheme {
        ProfileContent(
            user = session?.user,
            preferences = preferencesState?.preferences ?: PracticePreferences.Default,
            preferencesError = preferencesState?.errorMessage,
            streakDays = streakDays,
            showReactivationBanner = showReactivationBanner,
            actions = ProfileActions(
                onSignIn = onSignInTapped,
                onSignUp = onSignUpTapped,
                onSignOut = onSignOutTapped,
                onEditProfile = onEditProfileTapped,
                onChangeEmail = onChangeEmailTapped,
                onUpdatePassword = onUpdatePasswordTapped,
                onDeleteAccount = onDeleteAccountTapped,
                onAcknowledgeReactivation = onAcknowledgeReactivation,
                onReciterChange = { id -> preferencesViewModel?.setReciter(id) },
                onPlaybackSpeedChange = { speed -> preferencesViewModel?.setPlaybackSpeed(speed) },
                onReminderEnabledChange = { enabled -> preferencesViewModel?.setReminderEnabled(enabled) },
                onReminderTimeChange = { time -> preferencesViewModel?.setReminderTime(time) },
            ),
            modifier = modifier,
        )
    }
}

/** Everything the Profile tab can ask its caller to do. */
internal data class ProfileActions(
    val onSignIn: () -> Unit = {},
    val onSignUp: () -> Unit = {},
    val onSignOut: () -> Unit = {},
    val onEditProfile: () -> Unit = {},
    val onChangeEmail: () -> Unit = {},
    val onUpdatePassword: () -> Unit = {},
    val onDeleteAccount: () -> Unit = {},
    val onAcknowledgeReactivation: () -> Unit = {},
    val onReciterChange: (String) -> Unit = {},
    val onPlaybackSpeedChange: (Double) -> Unit = {},
    val onReminderEnabledChange: (Boolean) -> Unit = {},
    val onReminderTimeChange: (String) -> Unit = {},
)

/**
 * The Profile tab drawn from its state, so any state renders without a
 * ViewModel. The top app bar stays in place and the content scrolls below.
 *
 * @param user the signed-in user, or null when signed out.
 * @param preferencesError a failed preference save, shown under the preferences.
 */
@Composable
internal fun ProfileContent(
    user: StoredAuthUser?,
    preferences: PracticePreferences,
    preferencesError: String?,
    streakDays: Int,
    showReactivationBanner: Boolean,
    actions: ProfileActions,
    modifier: Modifier = Modifier,
) {
    Surface(modifier = modifier.fillMaxSize(), color = AppTheme.colorScheme.surface) {
        Column(modifier = Modifier.fillMaxSize()) {
            ProfileTopBar()
            if (user == null) {
                SignedOut(onSignIn = actions.onSignIn, onSignUp = actions.onSignUp)
            } else {
                SignedIn(
                    user = user,
                    preferences = preferences,
                    preferencesError = preferencesError,
                    streakDays = streakDays,
                    showReactivationBanner = showReactivationBanner,
                    actions = actions,
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProfileTopBar() {
    TopAppBar(title = { Text(text = stringResource(R.string.profile_title)) })
}

@Composable
private fun SignedOut(onSignIn: () -> Unit, onSignUp: () -> Unit) {
    val spacing = AppTheme.spacing
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = spacing.space4)
            .padding(top = spacing.space16),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(spacing.space3),
    ) {
        Icon(
            imageVector = Icons.Outlined.AccountCircle,
            contentDescription = null,
            modifier = Modifier.size(56.dp),
            tint = AppTheme.colorScheme.onSurfaceVariant,
        )
        Text(text = stringResource(R.string.profile_signed_out_title), style = AppTheme.typography.headlineSmall)
        Text(
            text = stringResource(R.string.profile_signed_out_body),
            style = AppTheme.typography.bodyMedium,
            color = AppTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
        AppButton(
            text = stringResource(R.string.profile_sign_in),
            onClick = onSignIn,
            modifier = Modifier.fillMaxWidth().padding(top = spacing.space3),
        )
        AppButton(
            text = stringResource(R.string.profile_create_account),
            onClick = onSignUp,
            modifier = Modifier.fillMaxWidth(),
            variant = AppButtonVariant.Outlined,
        )
    }
}

@Composable
private fun SignedIn(
    user: StoredAuthUser,
    preferences: PracticePreferences,
    preferencesError: String?,
    streakDays: Int,
    showReactivationBanner: Boolean,
    actions: ProfileActions,
) {
    val spacing = AppTheme.spacing
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = spacing.space4)
            .padding(top = spacing.space2, bottom = spacing.space6),
        verticalArrangement = Arrangement.spacedBy(spacing.space5),
    ) {
        if (showReactivationBanner) {
            ReactivationBanner(onDismiss = actions.onAcknowledgeReactivation)
        }
        ProfileCard(user = user, streakDays = streakDays, onEditProfile = actions.onEditProfile)
        PreferencesSection(preferences = preferences, error = preferencesError, actions = actions)
        AccountSection(
            email = user.email,
            passwordChangedAt = user.passwordChangedAt,
            onChangeEmail = actions.onChangeEmail,
            onUpdatePassword = actions.onUpdatePassword,
        )
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(spacing.space1),
        ) {
            AppButton(
                text = stringResource(R.string.profile_sign_out),
                onClick = actions.onSignOut,
                modifier = Modifier.fillMaxWidth(),
                variant = AppButtonVariant.Outlined,
            )
            TextButton(onClick = actions.onDeleteAccount, modifier = Modifier.fillMaxWidth()) {
                Text(text = stringResource(R.string.profile_delete_account), color = AppTheme.colorScheme.error)
            }
            Text(
                text = stringResource(R.string.profile_delete_account_footer),
                style = AppTheme.typography.bodySmall,
                color = AppTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = spacing.space4),
            )
        }
    }
}

/** The user's initial, name, email, level and streak, and Edit profile. */
@Composable
private fun ProfileCard(user: StoredAuthUser, streakDays: Int, onEditProfile: () -> Unit) {
    val spacing = AppTheme.spacing
    val name = user.displayName?.takeIf { it.isNotBlank() }?.trim() ?: user.email
    AppCard(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = PaddingValues(horizontal = spacing.space4, vertical = spacing.space5),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(spacing.space2),
        ) {
            Surface(
                modifier = Modifier.size(72.dp),
                shape = CircleShape,
                color = AppTheme.colorScheme.primaryContainer,
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = name.firstOrNull()?.uppercaseChar()?.toString() ?: "?",
                        style = AppTheme.typography.headlineMedium.copy(fontSize = 30.sp),
                    )
                }
            }
            Text(text = name, style = AppTheme.typography.titleLarge, textAlign = TextAlign.Center)
            Text(
                text = user.email,
                style = AppTheme.typography.bodyMedium,
                color = AppTheme.colorScheme.onSurfaceVariant,
            )
            Row(
                modifier = Modifier.padding(top = spacing.space1),
                horizontalArrangement = Arrangement.spacedBy(spacing.space2),
            ) {
                user.level?.let { ProfileBadge(text = ProfileCopy.levelLabel(it)) }
                if (streakDays > 0) {
                    ProfileBadge(text = stringResource(R.string.profile_streak_pill, streakDays), streak = true)
                }
            }
            AppButton(
                text = stringResource(R.string.profile_edit_profile),
                onClick = onEditProfile,
                modifier = Modifier.padding(top = spacing.space2),
                variant = AppButtonVariant.Outlined,
            )
        }
    }
}

/** A level or streak badge: information, not a control, in the secondary container colour. */
@Composable
private fun ProfileBadge(text: String, streak: Boolean = false) {
    Surface(shape = AppTheme.shapes.small, color = AppTheme.colorScheme.secondaryContainer) {
        Row(
            modifier = Modifier.padding(horizontal = AppTheme.spacing.space3, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            if (streak) {
                Icon(
                    imageVector = Icons.Outlined.LocalFireDepartment,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                )
            }
            Text(text = text, style = AppTheme.typography.labelLarge)
        }
    }
}

@Composable
private fun PreferencesSection(
    preferences: PracticePreferences,
    error: String?,
    actions: ProfileActions,
) {
    var editingTime by remember { mutableStateOf(false) }
    Section(title = stringResource(R.string.profile_preferences_section)) {
        MenuRow(
            label = stringResource(R.string.profile_pref_reference_reciter),
            options = ReciterOption.All,
            selected = ReciterOption.forId(preferences.referenceReciterId),
            optionLabel = { it.label },
            onSelect = { actions.onReciterChange(it.id) },
        )
        RowDivider()
        MenuRow(
            label = stringResource(R.string.profile_pref_playback_speed),
            options = PlaybackSpeedOption.All,
            selected = preferences.defaultPlaybackSpeed,
            optionLabel = { PlaybackSpeedOption.label(it) },
            onSelect = actions.onPlaybackSpeedChange,
        )
        RowDivider()
        ListItem(
            headlineContent = { Text(text = stringResource(R.string.profile_pref_daily_reminder)) },
            supportingContent = { Text(text = stringResource(R.string.profile_pref_daily_reminder_helper)) },
            trailingContent = {
                Switch(checked = preferences.dailyReminderEnabled, onCheckedChange = actions.onReminderEnabledChange)
            },
            colors = rowColors(),
        )
        if (preferences.dailyReminderEnabled) {
            RowDivider()
            ListItem(
                modifier = Modifier.clickable { editingTime = true },
                headlineContent = { Text(text = stringResource(R.string.profile_pref_reminder_time_title)) },
                supportingContent = { Text(text = ReminderClock.displayLabel(preferences.dailyReminderTime)) },
                colors = rowColors(),
            )
        }
    }
    error?.let {
        Text(text = it, style = AppTheme.typography.bodySmall, color = AppTheme.colorScheme.error)
    }
    if (editingTime) {
        ReminderTimeDialog(
            initialTime = preferences.dailyReminderTime,
            onConfirm = {
                actions.onReminderTimeChange(it)
                editingTime = false
            },
            onDismiss = { editingTime = false },
        )
    }
}

/** A preference chosen from a dropdown anchored to the row; a check marks the current choice. */
@Composable
private fun <T> MenuRow(
    label: String,
    options: List<T>,
    selected: T,
    optionLabel: (T) -> String,
    onSelect: (T) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        ListItem(
            modifier = Modifier.clickable { expanded = true },
            headlineContent = { Text(text = label) },
            supportingContent = { Text(text = optionLabel(selected)) },
            colors = rowColors(),
        )
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { option ->
                DropdownMenuItem(
                    text = { Text(text = optionLabel(option)) },
                    onClick = {
                        expanded = false
                        if (option != selected) onSelect(option)
                    },
                    trailingIcon = if (option == selected) {
                        { Icon(imageVector = Icons.Filled.Check, contentDescription = null) }
                    } else {
                        null
                    },
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ReminderTimeDialog(initialTime: String, onConfirm: (String) -> Unit, onDismiss: () -> Unit) {
    val (hour, minute) = ReminderClock.parse(initialTime)
    val timeState = rememberTimePickerState(initialHour = hour, initialMinute = minute, is24Hour = false)
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(onClick = { onConfirm(ReminderClock.format(timeState.hour, timeState.minute)) }) {
                Text(text = stringResource(R.string.profile_pref_reminder_time_confirm))
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(text = stringResource(R.string.profile_pref_reminder_time_cancel))
            }
        },
        title = { Text(text = stringResource(R.string.profile_pref_reminder_time_title)) },
        text = {
            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                TimePicker(state = timeState)
            }
        },
    )
}

@Composable
private fun AccountSection(
    email: String,
    passwordChangedAt: String?,
    onChangeEmail: () -> Unit,
    onUpdatePassword: () -> Unit,
) {
    val passwordSupport = passwordChangedDate(passwordChangedAt)
        ?.let { stringResource(R.string.profile_account_password_changed, it) }
        ?: stringResource(R.string.profile_account_password_sublabel)
    Section(title = stringResource(R.string.profile_account_section)) {
        ActionRow(
            label = stringResource(R.string.profile_account_email),
            value = email,
            support = stringResource(R.string.profile_account_email_helper),
            action = stringResource(R.string.profile_account_email_action),
            onAction = onChangeEmail,
        )
        RowDivider()
        ActionRow(
            label = stringResource(R.string.profile_account_password),
            value = PASSWORD_MASK,
            support = passwordSupport,
            action = stringResource(R.string.profile_account_password_action),
            onAction = onUpdatePassword,
        )
    }
}

@Composable
private fun ActionRow(label: String, value: String, support: String, action: String, onAction: () -> Unit) {
    ListItem(
        overlineContent = { Text(text = label) },
        headlineContent = { Text(text = value, maxLines = 1) },
        supportingContent = { Text(text = support) },
        trailingContent = { TextButton(onClick = onAction) { Text(text = action) } },
        colors = rowColors(),
    )
}

/** A titled group of rows on a filled card. */
@Composable
private fun Section(title: String, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space2)) {
        Text(
            text = title,
            style = AppTheme.typography.titleSmall,
            color = AppTheme.colorScheme.primary,
            modifier = Modifier.padding(horizontal = AppTheme.spacing.space1),
        )
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = AppTheme.colorScheme.surfaceContainerHighest),
        ) {
            content()
        }
    }
}

@Composable
private fun rowColors() = ListItemDefaults.colors(containerColor = AppTheme.colorScheme.surfaceContainerHighest)

@Composable
private fun RowDivider() {
    HorizontalDivider(color = AppTheme.colorScheme.outlineVariant)
}

private const val PASSWORD_MASK = "••••••••••"

private val passwordChangedFormat = DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.US)

private fun passwordChangedDate(iso: String?): String? =
    iso?.let { runCatching { Instant.parse(it) }.getOrNull() }
        ?.atZone(ZoneId.systemDefault())
        ?.toLocalDate()
        ?.format(passwordChangedFormat)
