package com.tilawah.android.features.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.withStyle
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tilawah.android.app.AppConfig
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.designsystem.components.PrimaryButton
import com.tilawah.android.features.auth.components.AuthDivider
import com.tilawah.android.features.auth.components.AuthTextField
import com.tilawah.android.features.auth.components.OAuthButtons
import com.tilawah.android.features.auth.components.PasswordField

/**
 * Sign-in screen. Matches `docs/design/Android _ Sign in.png` (hero
 * arch / "Welcome back" / email / password / forgot link / sign-in
 * CTA / OR divider / OAuth / footer link). Mirrors the web
 * `(auth)/sign-in/page.tsx` + `AuthForm.tsx` shape.
 */
@Composable
fun SignInScreen(
    viewModel: AuthViewModel,
    onAuthenticated: () -> Unit,
    onCreateAccount: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val copy = AuthCopyByMode.getValue(AuthMode.SignIn)
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
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = spacing.screenHorizontal, vertical = spacing.xl),
        ) {
            AuthArchIcon()
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
            )

            Row(modifier = Modifier.fillMaxWidth()) {
                Spacer(modifier = Modifier.weight(1f))
                TextButton(onClick = {}, enabled = false) {
                    Text(
                        text = "Forgot password?",
                        color = colors.primary,
                        style = BrandTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
                    )
                }
            }

            state.error?.let { error ->
                Text(
                    text = stringResource(error.titleRes),
                    color = colors.recording,
                    style = BrandTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
                )
            }

            PrimaryButton(
                label = if (state.pending) copy.submitPending else copy.submit,
                onClick = { viewModel.signIn(onAuthenticated) },
                enabled = !state.pending && state.email.isNotBlank() && state.password.isNotBlank(),
                trailingIcon = Icons.AutoMirrored.Filled.ArrowForward,
            )

            AuthDivider(label = "OR")
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

            // Two spans per the design: the lead-in stays muted secondary
            // text while only the actionable "Create an account" reads as a
            // primary (teal, semibold) link.
            val footer = buildAnnotatedString {
                withStyle(SpanStyle(color = colors.textSecondary)) {
                    append("New here? ")
                }
                withStyle(
                    SpanStyle(
                        color = colors.primary,
                        fontWeight = FontWeight.SemiBold,
                    ),
                ) {
                    append("Create an account")
                }
            }
            TextButton(onClick = onCreateAccount, enabled = !state.pending) {
                Text(
                    text = footer,
                    style = BrandTheme.typography.caption,
                )
            }
        }
    }
}

