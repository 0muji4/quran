package com.tilawah.android.features.profile

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import com.tilawah.android.backend.AuthUser
import com.tilawah.android.backend.ProfileService
import com.tilawah.android.features.auth.AuthMode
import com.tilawah.android.features.auth.AuthViewModel
import com.tilawah.android.features.auth.SignInScreen
import com.tilawah.android.features.auth.SignUpScreen
import com.tilawah.android.storage.AuthSession
import com.tilawah.android.storage.toAuthUser

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
    profileService: ProfileService,
    profileViewModel: ProfileViewModel,
    modifier: Modifier = Modifier,
) {
    val session by profileViewModel.session.collectAsStateWithLifecycle()
    val reactivationNotice by profileViewModel.reactivationNotice.collectAsStateWithLifecycle()
    var pendingMode: AuthMode? by remember { mutableStateOf(null) }
    var editingUser: AuthUser? by remember { mutableStateOf(null) }
    var changeEmailFor: String? by remember { mutableStateOf(null) }
    var updatingPassword by remember { mutableStateOf(false) }
    var deletingAccount by remember { mutableStateOf(false) }

    // Drop open sheets automatically if the session disappears under
    // us (sign-out from another path, token eviction, etc.).
    LaunchedEffect(session) {
        if (session == null) {
            editingUser = null
            changeEmailFor = null
            updatingPassword = false
            deletingAccount = false
        }
    }

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
                onEditProfileTapped = { editingUser = session?.toAuthUser() },
                onChangeEmailTapped = { changeEmailFor = session?.user?.email },
                onUpdatePasswordTapped = { updatingPassword = true },
                onDeleteAccountTapped = { deletingAccount = true },
                showReactivationBanner = reactivationNotice,
                onAcknowledgeReactivation = profileViewModel::acknowledgeReactivationNotice,
                modifier = modifier,
            )

            editingUser?.let { user ->
                val editViewModel: EditProfileViewModel = viewModel(
                    key = "edit-profile-${user.id}",
                    factory = viewModelFactory {
                        initializer {
                            EditProfileViewModel(
                                initialUser = user,
                                profileService = profileService,
                                authSession = authSession,
                            )
                        }
                    },
                )
                EditProfileSheet(
                    viewModel = editViewModel,
                    initialDisplayName = (user.displayName ?: "").trim(),
                    initialLevel = user.level,
                    onDismiss = { editingUser = null },
                )
            }

            changeEmailFor?.let { currentEmail ->
                val changeEmailViewModel: ChangeEmailViewModel = viewModel(
                    key = "change-email-$currentEmail",
                    factory = viewModelFactory {
                        initializer {
                            ChangeEmailViewModel(
                                currentEmail = currentEmail,
                                profileService = profileService,
                                authSession = authSession,
                            )
                        }
                    },
                )
                ChangeEmailSheet(
                    viewModel = changeEmailViewModel,
                    onDismiss = { changeEmailFor = null },
                )
            }

            if (updatingPassword) {
                val updatePasswordViewModel: UpdatePasswordViewModel = viewModel(
                    key = "update-password-${session?.user?.id}",
                    factory = viewModelFactory {
                        initializer {
                            UpdatePasswordViewModel(profileService = profileService)
                        }
                    },
                )
                UpdatePasswordSheet(
                    viewModel = updatePasswordViewModel,
                    onDismiss = { updatingPassword = false },
                )
            }

            if (deletingAccount) {
                val deleteAccountViewModel: DeleteAccountViewModel = viewModel(
                    key = "delete-account-${session?.user?.id}",
                    factory = viewModelFactory {
                        initializer {
                            DeleteAccountViewModel(
                                profileService = profileService,
                                authSession = authSession,
                            )
                        }
                    },
                )
                DeleteAccountSheet(
                    viewModel = deleteAccountViewModel,
                    onDismiss = { deletingAccount = false },
                )
            }
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
            onEditProfileTapped = {},
            onChangeEmailTapped = {},
            onUpdatePasswordTapped = {},
            onDeleteAccountTapped = {},
            modifier = modifier,
        )
    }
}
