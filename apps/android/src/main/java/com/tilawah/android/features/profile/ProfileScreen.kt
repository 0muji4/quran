package com.tilawah.android.features.profile

import androidx.compose.foundation.background
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
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tilawah.android.R
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.designsystem.components.BrandCard
import com.tilawah.android.designsystem.components.BrandCardStyle
import com.tilawah.android.designsystem.components.PrimaryButton
import com.tilawah.android.designsystem.components.SecondaryButton
import com.tilawah.android.storage.StoredSession

/**
 * Profile tab content. Renders one of two states keyed off the
 * presence of a [StoredSession]:
 *
 * - signed-out: "Welcome" header + Sign in / Create an account buttons
 * - signed-in: account summary card + Practice preferences + Account
 *   sections, mirroring `docs/design/Android _ Profile.png`.
 *
 * The signed-in layout is LEFT-aligned and scrollable. Several rows
 * (Practice preferences, "Last changed" sublabel, streak, export) are
 * UI-only placeholders with no backend yet — each is flagged with a
 * TODO so the wiring follow-up is easy to find.
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
            onEditProfileTapped = onEditProfileTapped,
        )

        PracticePreferencesSection()

        AccountSection(
            email = session.user.email,
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
    onEditProfileTapped: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    BrandCard(modifier = modifier.fillMaxWidth()) {
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
                // TODO(profile): wire skill level once the signed-in
                // user shape always carries it; default to intermediate.
                LevelPill(level = level)
                // TODO(profile): streak has no backend yet — placeholder.
                StreakPill(days = 5)
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
        Icon(
            imageVector = Icons.Filled.Star,
            contentDescription = null,
            tint = colors.goldOnLight,
            modifier = Modifier.size(14.dp),
        )
        Text(
            text = stringResource(R.string.profile_streak_pill, days),
            style = BrandTheme.typography.eyebrow,
            color = colors.goldOnLight,
        )
    }
}

@Composable
private fun PracticePreferencesSection(modifier: Modifier = Modifier) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    // TODO(profile): these preferences have no persistence/backend yet.
    // Values are placeholders; the daily-reminder switch state is local
    // only. Wire to a settings store when the feature lands.
    var reminderEnabled by remember { mutableStateOf(true) }

    SectionColumn(eyebrow = stringResource(R.string.profile_preferences_section)) {
        BrandCard(style = BrandCardStyle.Paper, modifier = Modifier.fillMaxWidth()) {
            Column {
                ChevronRow(
                    label = stringResource(R.string.profile_pref_reference_reciter),
                    value = stringResource(R.string.profile_pref_reference_reciter_value),
                )
                RowDivider()
                ChevronRow(
                    label = stringResource(R.string.profile_pref_playback_speed),
                    value = stringResource(R.string.profile_pref_playback_speed_value),
                )
                RowDivider()
                SwitchRow(
                    label = stringResource(R.string.profile_pref_daily_reminder),
                    value = stringResource(R.string.profile_pref_daily_reminder_value),
                    checked = reminderEnabled,
                    onCheckedChange = { reminderEnabled = it },
                )
            }
        }
    }
}

@Composable
private fun AccountSection(
    email: String,
    onChangeEmailTapped: () -> Unit,
    onUpdatePasswordTapped: () -> Unit,
    modifier: Modifier = Modifier,
) {
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
                    // TODO(profile): "Last changed" is a placeholder —
                    // the BFF does not expose a password-changed-at yet.
                    sublabel = stringResource(R.string.profile_account_password_sublabel),
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
