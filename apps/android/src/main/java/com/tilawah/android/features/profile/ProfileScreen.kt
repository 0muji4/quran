package com.tilawah.android.features.profile

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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tilawah.android.R
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.designsystem.components.BrandCard
import com.tilawah.android.designsystem.components.BrandCardStyle
import com.tilawah.android.designsystem.components.PrimaryButton
import com.tilawah.android.designsystem.components.SecondaryButton
import com.tilawah.android.storage.StoredSession
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Profile tab content. Renders one of two states keyed off the
 * presence of a [StoredSession]:
 *
 * - signed-out: "Welcome" header + Sign in / Create an account buttons
 * - signed-in: account summary card + Practice preferences + Account
 *   sections, mirroring `docs/design/Android _ Profile.png`.
 *
 * The signed-in layout is LEFT-aligned and scrollable. Practice
 * preferences persist through [PreferencesViewModel]; the streak count,
 * the "Last changed" sublabel, and Export remain UI-only placeholders
 * with no backend yet — each is flagged with a TODO.
 *
 * Navigation between the auth screens is delegated to the caller
 * (`ProfileAuthHost`) so this composable stays stateless.
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
    if (session == null) {
        SignedOutContent(
            onSignInTapped = onSignInTapped,
            onSignUpTapped = onSignUpTapped,
            modifier = modifier,
        )
    } else {
        SignedInContent(
            session = session,
            preferencesViewModel = checkNotNull(preferencesViewModel) {
                "preferencesViewModel is required for the signed-in Profile"
            },
            streakDays = streakDays,
            onSignOutTapped = onSignOutTapped,
            onEditProfileTapped = onEditProfileTapped,
            onChangeEmailTapped = onChangeEmailTapped,
            onUpdatePasswordTapped = onUpdatePasswordTapped,
            onDeleteAccountTapped = onDeleteAccountTapped,
            showReactivationBanner = showReactivationBanner,
            onAcknowledgeReactivation = onAcknowledgeReactivation,
            modifier = modifier,
        )
    }
}

@Composable
private fun SignedOutContent(
    onSignInTapped: () -> Unit,
    onSignUpTapped: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = spacing.screenHorizontal, vertical = spacing.xl),
        verticalArrangement = Arrangement.spacedBy(spacing.lg),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "Welcome",
            style = BrandTheme.typography.pageTitle,
            color = colors.textPrimary,
        )
        Text(
            text = "Sign in to sync your practice across devices.",
            style = BrandTheme.typography.body,
            color = colors.textSecondary,
        )
        PrimaryButton(label = "Sign in", onClick = onSignInTapped)
        OutlinedButton(
            onClick = onSignUpTapped,
            colors = ButtonDefaults.outlinedButtonColors(contentColor = colors.primary),
        ) {
            Text(
                text = "Create an account",
                style = BrandTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
            )
        }
    }
}

@Composable
private fun SignedInContent(
    session: StoredSession,
    preferencesViewModel: PreferencesViewModel,
    streakDays: Int,
    onSignOutTapped: () -> Unit,
    onEditProfileTapped: () -> Unit,
    onChangeEmailTapped: () -> Unit,
    onUpdatePasswordTapped: () -> Unit,
    onDeleteAccountTapped: () -> Unit,
    showReactivationBanner: Boolean,
    onAcknowledgeReactivation: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    val displayName = session.user.displayName?.takeIf { it.isNotBlank() } ?: session.user.email

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = spacing.screenHorizontal, vertical = spacing.xl),
        verticalArrangement = Arrangement.spacedBy(spacing.xl),
    ) {
        if (showReactivationBanner) {
            ReactivationBanner(onDismiss = onAcknowledgeReactivation)
        }

        // Header: gold eyebrow + serif title, left-aligned.
        Column(verticalArrangement = Arrangement.spacedBy(spacing.xs)) {
            Text(
                text = stringResource(R.string.profile_eyebrow),
                style = BrandTheme.typography.eyebrow,
                color = colors.accent,
            )
            Text(
                text = stringResource(R.string.profile_title),
                style = BrandTheme.typography.pageTitle,
                color = colors.textPrimary,
            )
        }

        SummaryCard(
            displayName = displayName,
            level = session.user.level,
            streakDays = streakDays,
            onEditProfileTapped = onEditProfileTapped,
        )

        PracticePreferencesSection(viewModel = preferencesViewModel)

        AccountSection(
            email = session.user.email,
            passwordChangedAt = session.user.passwordChangedAt,
            onChangeEmailTapped = onChangeEmailTapped,
            onUpdatePasswordTapped = onUpdatePasswordTapped,
        )

        // Keep destructive + session actions reachable below the fold.
        SecondaryButton(label = "Sign out", onClick = onSignOutTapped)
        TextButton(
            onClick = onDeleteAccountTapped,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(
                text = ProfileCopy.deleteAccountEntryLabel,
                color = colors.recording,
                style = BrandTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
            )
        }
    }
}

@Composable
private fun SummaryCard(
    displayName: String,
    level: String?,
    streakDays: Int,
    onEditProfileTapped: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    // Captured here so the draw lambda (a DrawScope, not a composable) can
    // reach the gold without re-entering the theme.
    val bracketColor = colors.decorative
    BrandCard(
        modifier = modifier
            .fillMaxWidth()
            .drawWithContent {
                drawContent()
                drawCornerBrackets(bracketColor)
            },
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(spacing.md),
        ) {
            GradientAvatar(name = displayName, size = 72.dp, monogramFontSize = 28)
            Text(
                text = displayName,
                style = BrandTheme.typography.sectionTitle.copy(
                    fontFamily = FontFamily.Serif,
                    fontSize = BrandTheme.typography.pageTitle.fontSize,
                ),
                color = colors.textPrimary,
                textAlign = TextAlign.Center,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(spacing.sm)) {
                LevelPill(level = level)
                StreakPill(days = streakDays)
            }
            SecondaryButton(
                label = ProfileCopy.editEntryLabel,
                onClick = onEditProfileTapped,
                fillWidth = false,
            )
        }
    }
}

/**
 * Circular avatar with a teal -> gold gradient and a white serif
 * monogram taken from the first letter of [name]. No photo upload
 * exists yet, so the gradient stands in for an avatar everywhere.
 */
@Composable
internal fun GradientAvatar(
    name: String,
    size: androidx.compose.ui.unit.Dp,
    monogramFontSize: Int,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    val monogram = name.trim().firstOrNull()?.uppercaseChar()?.toString() ?: "?"
    val brush = Brush.linearGradient(listOf(colors.primary, colors.accent))
    Box(
        modifier = modifier
            .size(size)
            .clip(CircleShape)
            .background(brush),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = monogram,
            color = colors.textOnPrimary,
            style = BrandTheme.typography.pageTitle.copy(
                fontSize = monogramFontSize.sp,
                fontWeight = FontWeight.Medium,
            ),
        )
    }
}

@Composable
private fun LevelPill(level: String?, modifier: Modifier = Modifier) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    val label = ProfileCopy.levelLabel(level ?: "intermediate").uppercase()
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(percent = 50))
            .background(colors.success.copy(alpha = 0.14f))
            .padding(horizontal = spacing.md, vertical = spacing.xs),
    ) {
        Text(
            text = label,
            style = BrandTheme.typography.eyebrow,
            color = colors.success,
        )
    }
}

@Composable
private fun StreakPill(days: Int, modifier: Modifier = Modifier) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(percent = 50))
            .background(colors.accent.copy(alpha = 0.16f))
            .padding(horizontal = spacing.md, vertical = spacing.xs),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(spacing.xs),
    ) {
        Text(
            text = "✦",
            style = BrandTheme.typography.eyebrow,
            color = colors.goldOnLight,
        )
        Text(
            text = stringResource(R.string.profile_streak_pill, days),
            style = BrandTheme.typography.eyebrow,
            color = colors.goldOnLight,
        )
    }
}

@Composable
private fun PracticePreferencesSection(
    viewModel: PreferencesViewModel,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    val uiState by viewModel.state.collectAsStateWithLifecycle()
    val prefs = uiState.preferences

    // Resolve the stored row when the card first appears; the VM no-ops on
    // repeat calls, and a failed load degrades to the rendered defaults.
    LaunchedEffect(Unit) { viewModel.load() }

    var editingTime by remember { mutableStateOf(false) }

    SectionColumn(eyebrow = stringResource(R.string.profile_preferences_section), modifier = modifier) {
        BrandCard(style = BrandCardStyle.Paper, modifier = Modifier.fillMaxWidth()) {
            Column {
                PrefMenuRow(
                    label = stringResource(R.string.profile_pref_reference_reciter),
                    options = ReciterOption.All,
                    selected = ReciterOption.forId(prefs.referenceReciterId),
                    optionLabel = { it.label },
                    onSelect = { viewModel.setReciter(it.id) },
                )
                RowDivider()
                PrefMenuRow(
                    label = stringResource(R.string.profile_pref_playback_speed),
                    options = PlaybackSpeedOption.All,
                    selected = prefs.defaultPlaybackSpeed,
                    optionLabel = { PlaybackSpeedOption.label(it) },
                    onSelect = { viewModel.setPlaybackSpeed(it) },
                )
                RowDivider()
                SwitchRow(
                    label = stringResource(R.string.profile_pref_daily_reminder),
                    value = if (prefs.dailyReminderEnabled) {
                        ReminderClock.displayLabel(prefs.dailyReminderTime)
                    } else {
                        stringResource(R.string.profile_pref_daily_reminder_off)
                    },
                    checked = prefs.dailyReminderEnabled,
                    onCheckedChange = { viewModel.setReminderEnabled(it) },
                    // The reminder time is only meaningful while the reminder
                    // is on, so the row opens the picker only then.
                    onValueClick = if (prefs.dailyReminderEnabled) {
                        { editingTime = true }
                    } else {
                        null
                    },
                )
            }
        }
        uiState.errorMessage?.let { message ->
            Text(text = message, style = BrandTheme.typography.caption, color = colors.recording)
        }
    }

    if (editingTime) {
        ReminderTimeDialog(
            initialTime = prefs.dailyReminderTime,
            onConfirm = {
                viewModel.setReminderTime(it)
                editingTime = false
            },
            onDismiss = { editingTime = false },
        )
    }
}

/**
 * A disclosure row whose value is chosen from a dropdown anchored to the
 * row — used for the single-select preferences (reciter, speed). A
 * checkmark marks the current choice.
 */
@Composable
private fun <T> PrefMenuRow(
    label: String,
    options: List<T>,
    selected: T,
    optionLabel: (T) -> String,
    onSelect: (T) -> Unit,
) {
    val colors = BrandTheme.colors
    var expanded by remember { mutableStateOf(false) }
    Box {
        ChevronRow(label = label, value = optionLabel(selected), onClick = { expanded = true })
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { option ->
                DropdownMenuItem(
                    text = { Text(optionLabel(option)) },
                    onClick = {
                        expanded = false
                        if (option != selected) onSelect(option)
                    },
                    trailingIcon = if (option == selected) {
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ReminderTimeDialog(
    initialTime: String,
    onConfirm: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = BrandTheme.colors
    val (hour, minute) = ReminderClock.parse(initialTime)
    val timeState = rememberTimePickerState(initialHour = hour, initialMinute = minute, is24Hour = false)
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(onClick = { onConfirm(ReminderClock.format(timeState.hour, timeState.minute)) }) {
                Text(
                    text = stringResource(R.string.profile_pref_reminder_time_confirm),
                    color = colors.primary,
                    style = BrandTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
                )
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(
                    text = stringResource(R.string.profile_pref_reminder_time_cancel),
                    color = colors.textSecondary,
                    style = BrandTheme.typography.body,
                )
            }
        },
        title = {
            Text(
                text = stringResource(R.string.profile_pref_reminder_time_title),
                style = BrandTheme.typography.sectionTitle,
                color = colors.textPrimary,
            )
        },
        text = {
            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                TimePicker(state = timeState)
            }
        },
    )
}

private val passwordChangedFormat = DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.US)

private fun passwordChangedDate(iso: String?): String? =
    iso?.let { runCatching { Instant.parse(it) }.getOrNull() }
        ?.atZone(ZoneId.systemDefault())
        ?.toLocalDate()
        ?.format(passwordChangedFormat)

@Composable
private fun AccountSection(
    email: String,
    passwordChangedAt: String?,
    onChangeEmailTapped: () -> Unit,
    onUpdatePasswordTapped: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val passwordSublabel = passwordChangedDate(passwordChangedAt)
        ?.let { stringResource(R.string.profile_account_password_changed, it) }
        ?: stringResource(R.string.profile_account_password_sublabel)
    SectionColumn(eyebrow = stringResource(R.string.profile_account_section), modifier = modifier) {
        BrandCard(style = BrandCardStyle.Paper, modifier = Modifier.fillMaxWidth()) {
            Column {
                ActionRow(
                    label = stringResource(R.string.profile_account_email),
                    sublabel = email,
                    action = stringResource(R.string.profile_account_email_action),
                    onActionTapped = onChangeEmailTapped,
                )
                RowDivider()
                ActionRow(
                    label = stringResource(R.string.profile_account_password),
                    sublabel = passwordSublabel,
                    action = stringResource(R.string.profile_account_password_action),
                    onActionTapped = onUpdatePasswordTapped,
                )
                RowDivider()
                ActionRow(
                    label = stringResource(R.string.profile_account_export),
                    sublabel = stringResource(R.string.profile_account_export_sublabel),
                    action = stringResource(R.string.profile_account_export_action),
                    // TODO(profile): data export has no backend yet.
                    onActionTapped = {},
                )
            }
        }
    }
}

@Composable
private fun SectionColumn(
    eyebrow: String,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(spacing.sm),
    ) {
        Text(
            text = eyebrow,
            style = BrandTheme.typography.eyebrow,
            color = colors.textSecondary,
        )
        content()
    }
}

@Composable
private fun ChevronRow(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    Row(
        modifier = modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(vertical = spacing.sm),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(spacing.xs),
        ) {
            Text(text = label, style = BrandTheme.typography.body, color = colors.textPrimary)
            Text(text = value, style = BrandTheme.typography.caption, color = colors.textSecondary)
        }
        Icon(
            imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
            contentDescription = null,
            tint = colors.textSecondary,
        )
    }
}

@Composable
private fun SwitchRow(
    label: String,
    value: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    onValueClick: (() -> Unit)? = null,
) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = spacing.sm),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(
            modifier = Modifier
                .weight(1f)
                .then(if (onValueClick != null) Modifier.clickable(onClick = onValueClick) else Modifier),
            verticalArrangement = Arrangement.spacedBy(spacing.xs),
        ) {
            Text(text = label, style = BrandTheme.typography.body, color = colors.textPrimary)
            Text(text = value, style = BrandTheme.typography.caption, color = colors.textSecondary)
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = colors.textOnPrimary,
                checkedTrackColor = colors.success,
            ),
        )
    }
}

@Composable
private fun ActionRow(
    label: String,
    sublabel: String,
    action: String,
    onActionTapped: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = spacing.sm),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(spacing.xs),
        ) {
            Text(text = label, style = BrandTheme.typography.body, color = colors.textPrimary)
            Text(text = sublabel, style = BrandTheme.typography.caption, color = colors.textSecondary)
        }
        TextButton(onClick = onActionTapped, contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = spacing.sm)) {
            Text(
                text = action,
                color = colors.primary,
                style = BrandTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
            )
        }
    }
}

@Composable
private fun RowDivider() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(1.dp)
            .background(BrandTheme.colors.borderDefault),
    )
}

/**
 * Gold L-shaped marks just inside each rounded corner — the manuscript-
 * frame motif on the Profile summary card. Inset by the card radius so
 * the right angles land on the flat edge rather than over the curve.
 */
private fun DrawScope.drawCornerBrackets(color: Color) {
    val inset = 16.dp.toPx()
    val arm = 16.dp.toPx()
    val width = 1.5.dp.toPx()
    val right = size.width - inset
    val bottom = size.height - inset
    listOf(
        // (corner x, corner y, horizontal arm dir, vertical arm dir)
        Triple(inset, inset, 1f to 1f),
        Triple(right, inset, -1f to 1f),
        Triple(inset, bottom, 1f to -1f),
        Triple(right, bottom, -1f to -1f),
    ).forEach { (cx, cy, dir) ->
        val (hx, vy) = dir
        drawLine(color, Offset(cx, cy), Offset(cx + arm * hx, cy), width)
        drawLine(color, Offset(cx, cy), Offset(cx, cy + arm * vy), width)
    }
}
