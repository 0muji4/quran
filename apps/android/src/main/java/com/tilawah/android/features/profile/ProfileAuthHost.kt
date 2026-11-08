package com.tilawah.android.features.profile

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.tilawah.android.backend.AuthApi
import com.tilawah.android.backend.PreferencesClient
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
    preferencesClient: PreferencesClient,
    profileViewModel: ProfileViewModel,
    modifier: Modifier = Modifier,
) {
    val session by profileViewModel.session.collectAsStateWithLifecycle()
    val reactivationNotice by profileViewModel.reactivationNotice.collectAsStateWithLifecycle()
    val streakDays by profileViewModel.streakDays.collectAsStateWithLifecycle()
    val activeSheet by profileViewModel.activeSheet.collectAsStateWithLifecycle()
    // Saveable so a rotation keeps the auth screen open. A tab switch
    // still resets it: the tab leaves the composition, and that is the
    // way out of these screens, which have no back action.
    var pendingMode: AuthMode? by rememberSaveable { mutableStateOf<AuthMode?>(null) }

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
            // Keyed by user id so a different identity loads its own
            // preferences rather than inheriting the previous session's.
            val preferencesViewModel: PreferencesViewModel = viewModel(
                key = "preferences-${session?.user?.id}",
                factory = viewModelFactory {
                    initializer { PreferencesViewModel(client = preferencesClient) }
                },
            )
            ProfileScreen(
                session = session,
                preferencesViewModel = preferencesViewModel,
                streakDays = streakDays,
                onSignInTapped = { pendingMode = AuthMode.SignIn },
                onSignUpTapped = { pendingMode = AuthMode.SignUp },
                onSignOutTapped = profileViewModel::signOut,
                onEditProfileTapped = {
                    session?.let { profileViewModel.showSheet(ProfileSheet.EditProfile(it.toAuthUser())) }
                },
                onChangeEmailTapped = {
                    session?.let { profileViewModel.showSheet(ProfileSheet.ChangeEmail(it.user.email)) }
                },
                onUpdatePasswordTapped = { profileViewModel.showSheet(ProfileSheet.UpdatePassword) },
                onDeleteAccountTapped = { profileViewModel.showSheet(ProfileSheet.DeleteAccount) },
                showReactivationBanner = reactivationNotice,
                onAcknowledgeReactivation = profileViewModel::acknowledgeReactivationNotice,
                modifier = modifier,
            )

            when (val sheet = activeSheet) {
                is ProfileSheet.EditProfile -> {
                    val user = sheet.user
                    val editViewModel: EditProfileViewModel = viewModel(
                        viewModelStoreOwner = profileViewModel.sheetViewModels,
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
                        onDismiss = profileViewModel::dismissSheet,
                    )
                }

                is ProfileSheet.ChangeEmail -> {
                    val currentEmail = sheet.currentEmail
                    val changeEmailViewModel: ChangeEmailViewModel = viewModel(
                        viewModelStoreOwner = profileViewModel.sheetViewModels,
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
                        onDismiss = profileViewModel::dismissSheet,
                    )
                }

                ProfileSheet.UpdatePassword -> {
                    val updatePasswordViewModel: UpdatePasswordViewModel = viewModel(
                        viewModelStoreOwner = profileViewModel.sheetViewModels,
                        factory = viewModelFactory {
                            initializer {
                                UpdatePasswordViewModel(profileService = profileService)
                            }
                        },
                    )
                    UpdatePasswordSheet(
                        viewModel = updatePasswordViewModel,
                        onDismiss = profileViewModel::dismissSheet,
                    )
                }

                ProfileSheet.DeleteAccount -> {
                    val deleteAccountViewModel: DeleteAccountViewModel = viewModel(
                        viewModelStoreOwner = profileViewModel.sheetViewModels,
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
                        onDismiss = profileViewModel::dismissSheet,
                    )
                }

                null -> Unit
            }
        }

        pendingMode == AuthMode.SignIn -> SignInScreen(
            viewModel = authViewModel,
            onAuthenticated = { /* session flow flips the branch */ },
            onCreateAccount = { pendingMode = AuthMode.SignUp },
            onBack = { pendingMode = null },
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
