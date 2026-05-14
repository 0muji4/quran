package com.tilawah.android.features.profile

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.tilawah.android.backend.AuthApi
import com.tilawah.android.features.auth.AuthMode
import com.tilawah.android.features.auth.AuthViewModel
import com.tilawah.android.features.auth.SignInScreen
import com.tilawah.android.features.auth.SignUpScreen
import com.tilawah.android.storage.AuthSession

/**
 * Stateful host that switches between [ProfileScreen] (signed-out
 * shell or signed-in summary) and the [SignInScreen] / [SignUpScreen]
 * the user taps into. Lives inside the Profile tab so the rest of the
 * navigation graph (Library / Practice / History) is untouched.
 *
 * Reuses a single [AuthViewModel] across SignIn ↔ SignUp toggles —
 * email / password already typed survive the switch, matching the web
 * `AuthForm` behaviour.
 */
@Composable
fun ProfileAuthHost(
    authApi: AuthApi,
    authSession: AuthSession,
    profileViewModel: ProfileViewModel,
    modifier: Modifier = Modifier,
) {
    val session by profileViewModel.session.collectAsStateWithLifecycle()
    var pendingMode: AuthMode? by remember { mutableStateOf(null) }

    val authViewModel: AuthViewModel = viewModel(
        factory = viewModelFactory {
            initializer { AuthViewModel(authApi = authApi, authSession = authSession) }
        },
    )

    when {
        session != null -> {
            // Returning to a signed-in state automatically dismisses
            // any open auth screen.
            pendingMode = null
            ProfileScreen(
                session = session,
                onSignInTapped = { pendingMode = AuthMode.SignIn },
                onSignUpTapped = { pendingMode = AuthMode.SignUp },
                onSignOutTapped = profileViewModel::signOut,
                modifier = modifier,
            )
        }

        pendingMode == AuthMode.SignIn -> SignInScreen(
            viewModel = authViewModel,
            onAuthenticated = { /* session flow flips the branch */ },
            onCreateAccount = { pendingMode = AuthMode.SignUp },
            modifier = modifier,
        )

        pendingMode == AuthMode.SignUp -> SignUpScreen(
            viewModel = authViewModel,
            onAuthenticated = { /* session flow flips the branch */ },
            onSignIn = { pendingMode = AuthMode.SignIn },
            modifier = modifier,
        )

        else -> ProfileScreen(
            session = null,
            onSignInTapped = { pendingMode = AuthMode.SignIn },
            onSignUpTapped = { pendingMode = AuthMode.SignUp },
            onSignOutTapped = {},
            modifier = modifier,
        )
    }
}

