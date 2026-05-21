package com.tilawah.android.features.profile

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.designsystem.components.PrimaryButton
import com.tilawah.android.designsystem.components.PrimaryButtonTint
import com.tilawah.android.storage.StoredSession

/**
 * Profile tab content. Renders one of two states keyed off the
 * presence of a [StoredSession]:
 *
 * - signed-out: "Welcome" header + Sign in / Create an account buttons
 * - signed-in: display name + email + Sign out
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
        if (session == null) {
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
        } else {
            Text(
                text = session.user.displayName ?: session.user.email,
                style = BrandTheme.typography.pageTitle,
                color = colors.textPrimary,
            )
            Text(
                text = session.user.email,
                style = BrandTheme.typography.body,
                color = colors.textSecondary,
            )
            TextButton(onClick = onEditProfileTapped) {
                Text(
                    text = ProfileCopy.editEntryLabel,
                    color = colors.primary,
                    style = BrandTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
                )
            }
            TextButton(onClick = onChangeEmailTapped) {
                Text(
                    text = ProfileCopy.changeEmailEntryLabel,
                    color = colors.primary,
                    style = BrandTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
                )
            }
            PrimaryButton(
                label = "Sign out",
                onClick = onSignOutTapped,
                tint = PrimaryButtonTint.Accent,
            )
        }
    }
}
