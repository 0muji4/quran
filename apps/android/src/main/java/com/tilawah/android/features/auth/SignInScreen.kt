package com.tilawah.android.features.auth

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tilawah.android.R
import com.tilawah.android.app.AppConfig
import com.tilawah.android.designsystem.AppTheme

/**
 * Sign in, on [AppTheme] and Material 3 components (ADR 0030): a top app bar
 * with back, the email form, then Google and Apple, and the way across to
 * create an account. Back and system back leave the screen, except while
 * signing in.
 */
@Composable
fun SignInScreen(
    viewModel: AuthViewModel,
    onAuthenticated: () -> Unit,
    onCreateAccount: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    BackHandler { if (!state.pending) onBack() }

    val context = LocalContext.current
    val googleClient = remember {
        AppConfig.googleServerClientId
            .takeIf { it.isNotBlank() }
            ?.let { GoogleCredentialClient(context, it) }
    }

    AppTheme {
        SignInContent(
            state = state,
            onEmailChange = viewModel::setEmail,
            onPasswordChange = viewModel::setPassword,
            onSubmit = { viewModel.signIn(onAuthenticated) },
            onGoogle = googleClient?.let { client ->
                {
                    viewModel.signInWithGoogle(
                        getIdToken = { nonce -> client.getIdToken(nonce) },
                        onSuccess = onAuthenticated,
                    )
                }
            },
            onCreateAccount = onCreateAccount,
            onBack = onBack,
            modifier = modifier,
        )
    }
}

/**
 * The sign-in screen drawn from its state, so any state renders without a
 * ViewModel. [onGoogle] is null when the app is not configured for Google.
 */
@Composable
internal fun SignInContent(
    state: AuthUiState,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onSubmit: () -> Unit,
    onGoogle: (() -> Unit)?,
    onCreateAccount: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val idle = !state.pending
    AuthScaffold(
        title = stringResource(R.string.auth_sign_in_title),
        onBack = onBack,
        backEnabled = idle,
        modifier = modifier,
    ) {
        AuthLede(text = stringResource(R.string.auth_sign_in_lede))
        AuthTextField(
            label = stringResource(R.string.auth_email),
            value = state.email,
            onValueChange = onEmailChange,
            enabled = idle,
            keyboardType = KeyboardType.Email,
        )
        Column {
            AuthTextField(
                label = stringResource(R.string.auth_password),
                value = state.password,
                onValueChange = onPasswordChange,
                enabled = idle,
                password = true,
            )
            // Password reset is not built yet (ADR 0010): shown, but disabled.
            TextButton(onClick = {}, enabled = false, modifier = Modifier.align(Alignment.End)) {
                Text(text = stringResource(R.string.auth_forgot_password))
            }
        }
        state.error?.let { AuthError(error = it) }
        AuthSubmitButton(
            label = stringResource(R.string.auth_sign_in),
            pendingLabel = stringResource(R.string.auth_signing_in),
            pending = state.pending,
            enabled = state.email.isNotBlank() && state.password.isNotBlank(),
            onClick = onSubmit,
        )
        AuthOrDivider()
        AuthProviderButtons(onGoogle = onGoogle, enabled = idle)
        AuthFooter(
            prompt = stringResource(R.string.auth_new_here),
            action = stringResource(R.string.auth_create_account_link),
            onAction = onCreateAccount,
            enabled = idle,
        )
    }
}
