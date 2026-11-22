package com.tilawah.android.features.auth

import androidx.activity.compose.BackHandler
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tilawah.android.R
import com.tilawah.android.app.AppConfig
import com.tilawah.android.designsystem.AppTheme

/**
 * Create account, on [AppTheme] and Material 3 components (ADR 0030): a top
 * app bar with back, the name, email and password, the level, the terms, then
 * Google and Apple, and the way across to sign in. Back and system back return
 * to sign in, except while the account is being created.
 */
@Composable
fun SignUpScreen(
    viewModel: AuthViewModel,
    onAuthenticated: () -> Unit,
    onSignIn: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    BackHandler { if (!state.pending) onSignIn() }

    val context = LocalContext.current
    val googleClient = remember {
        AppConfig.googleServerClientId
            .takeIf { it.isNotBlank() }
            ?.let { GoogleCredentialClient(context, it) }
    }

    AppTheme {
        SignUpContent(
            state = state,
            onDisplayNameChange = viewModel::setDisplayName,
            onEmailChange = viewModel::setEmail,
            onPasswordChange = viewModel::setPassword,
            onLevelChange = viewModel::setLevel,
            onAgreedToTermsChange = viewModel::setAgreedToTerms,
            onSubmit = { viewModel.signUp(onAuthenticated) },
            onGoogle = googleClient?.let { client ->
                {
                    viewModel.signInWithGoogle(
                        getIdToken = { nonce -> client.getIdToken(nonce) },
                        onSuccess = onAuthenticated,
                    )
                }
            },
            onSignIn = onSignIn,
            modifier = modifier,
        )
    }
}

/**
 * The create-account screen drawn from its state, so any state renders
 * without a ViewModel. [onGoogle] is null when the app is not configured for
 * Google.
 */
@Composable
internal fun SignUpContent(
    state: AuthUiState,
    onDisplayNameChange: (String) -> Unit,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onLevelChange: (Level) -> Unit,
    onAgreedToTermsChange: (Boolean) -> Unit,
    onSubmit: () -> Unit,
    onGoogle: (() -> Unit)?,
    onSignIn: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val idle = !state.pending
    AuthScaffold(
        title = stringResource(R.string.auth_sign_up_title),
        onBack = onSignIn,
        backEnabled = idle,
        modifier = modifier,
    ) {
        AuthLede(text = stringResource(R.string.auth_sign_up_lede))
        AuthTextField(
            label = stringResource(R.string.auth_display_name),
            value = state.displayName,
            onValueChange = onDisplayNameChange,
            enabled = idle,
            supporting = stringResource(R.string.auth_display_name_helper),
            capitalization = KeyboardCapitalization.Words,
        )
        AuthTextField(
            label = stringResource(R.string.auth_email),
            value = state.email,
            onValueChange = onEmailChange,
            enabled = idle,
            keyboardType = KeyboardType.Email,
        )
        AuthTextField(
            label = stringResource(R.string.auth_password),
            value = state.password,
            onValueChange = onPasswordChange,
            enabled = idle,
            supporting = stringResource(R.string.auth_password_helper),
            password = true,
        )
        AuthLevelSection(selection = state.level, onSelect = onLevelChange, enabled = idle)
        AuthTermsRow(
            checked = state.agreedToTerms,
            onCheckedChange = onAgreedToTermsChange,
            enabled = idle,
            error = state.termsError,
        )
        state.error?.let { AuthError(error = it) }
        AuthSubmitButton(
            label = stringResource(R.string.auth_create_account),
            pendingLabel = stringResource(R.string.auth_creating_account),
            pending = state.pending,
            enabled = state.email.isNotBlank() && state.password.isNotBlank(),
            onClick = onSubmit,
        )
        AuthOrDivider()
        AuthProviderButtons(onGoogle = onGoogle, enabled = idle)
        AuthFooter(
            prompt = stringResource(R.string.auth_have_account),
            action = stringResource(R.string.auth_sign_in_link),
            onAction = onSignIn,
            enabled = idle,
        )
    }
}
