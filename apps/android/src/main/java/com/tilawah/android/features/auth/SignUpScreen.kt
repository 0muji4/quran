package com.tilawah.android.features.auth

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tilawah.android.app.AppConfig
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.designsystem.components.PrimaryButton
import com.tilawah.android.features.auth.components.AuthDivider
import com.tilawah.android.features.auth.components.AuthTextField
import com.tilawah.android.features.auth.components.LevelSelector
import com.tilawah.android.features.auth.components.OAuthButtons
import com.tilawah.android.features.auth.components.PasswordField

/**
 * Sign-up screen: back chevron, eyebrow, "Create your account", lede,
 * OAuth, divider, name, email, password + helper, level cards, terms
 * gate, primary CTA, "Already have an account?" footer.
 */
@Composable
fun SignUpScreen(
    viewModel: AuthViewModel,
    onAuthenticated: () -> Unit,
    onSignIn: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val copy = AuthCopyByMode.getValue(AuthMode.SignUp)
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing

    val context = LocalContext.current
    val googleClient = remember {
        AppConfig.googleServerClientId
            .takeIf { it.isNotBlank() }
            ?.let { GoogleCredentialClient(context, it) }
    }

    Box(modifier = modifier.fillMaxSize()) {
        Column(
            verticalArrangement = Arrangement.spacedBy(spacing.lg),
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = spacing.screenHorizontal, vertical = spacing.xl),
        ) {
            // Header: circular outlined back chevron, top-left, returning
            // to sign-in (the only prior auth screen). A single-step flow
            // carries no step indicator.
            Box(
                modifier = Modifier
                    .size(spacing.minTapTarget)
                    .clip(CircleShape)
                    .border(BorderStroke(1.dp, colors.borderDefault), CircleShape)
                    .clickable(enabled = !state.pending, onClick = onSignIn),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back to sign in",
                    tint = colors.textPrimary,
                    modifier = Modifier.size(20.dp),
                )
            }
            copy.eyebrow?.let {
                Text(
                    text = "✦ ${it.uppercase()}",
                    style = BrandTheme.typography.eyebrow.copy(fontWeight = FontWeight.SemiBold),
                    color = colors.accent,
                )
            }
            Text(
                text = copy.title,
                style = BrandTheme.typography.pageTitle,
                color = colors.textPrimary,
            )
            Text(
                text = copy.lede,
                style = BrandTheme.typography.body,
                color = colors.textSecondary,
            )

            OAuthButtons(
                onGoogle = googleClient?.let { client ->
                    {
                        viewModel.signInWithGoogle(
                            getIdToken = { nonce -> client.getIdToken(nonce) },
                            onSuccess = onAuthenticated,
                        )
                    }
                },
            )
            AuthDivider(label = "OR WITH EMAIL")

            AuthTextField(
                label = "YOUR NAME",
                value = state.displayName,
                onValueChange = viewModel::setDisplayName,
                enabled = !state.pending,
            )
            AuthTextField(
                label = "EMAIL",
                value = state.email,
                onValueChange = viewModel::setEmail,
                keyboardType = KeyboardType.Email,
                enabled = !state.pending,
            )
            PasswordField(
                label = "PASSWORD",
                value = state.password,
                onValueChange = viewModel::setPassword,
                enabled = !state.pending,
                helperText = "Use 8+ characters with a mix of letters and numbers",
            )

            LevelSelector(
                selection = state.level,
                onSelect = viewModel::setLevel,
                enabled = !state.pending,
            )

            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(
                    checked = state.agreedToTerms,
                    onCheckedChange = viewModel::setAgreedToTerms,
                    enabled = !state.pending,
                    colors = CheckboxDefaults.colors(checkedColor = colors.primary),
                )
                Text(
                    text = "I agree to the Terms of Service and Privacy Policy.",
                    style = BrandTheme.typography.caption,
                    color = if (state.termsError) colors.recording else colors.textPrimary,
                )
            }
            if (state.termsError) {
                Text(
                    text = "Please accept the Terms of Service to continue.",
                    style = BrandTheme.typography.caption,
                    color = colors.recording,
                )
            }

            state.error?.let { error ->
                Text(
                    text = stringResource(error.titleRes),
                    style = BrandTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
                    color = colors.recording,
                )
            }

            PrimaryButton(
                label = if (state.pending) copy.submitPending else copy.submit,
                onClick = { viewModel.signUp(onAuthenticated) },
                enabled = !state.pending && state.email.isNotBlank() && state.password.isNotBlank(),
            )

            TextButton(onClick = onSignIn, enabled = !state.pending) {
                Text(
                    text = "Already have an account? Sign in",
                    color = colors.primary,
                    style = BrandTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
                )
            }
        }
    }
}
