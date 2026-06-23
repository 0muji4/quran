package com.tilawah.android.features.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tilawah.android.app.AppError
import com.tilawah.android.backend.AuthApi
import com.tilawah.android.storage.AuthSession
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * State container for `SignInScreen` (and, in a follow-up PR,
 * `SignUpScreen`). Wraps the BFF call in `AuthApi` and persists the
 * resulting tokens via `AuthSession`.
 *
 * Follows the existing feature-VM shape: manual factory injection
 * (no DI framework), `StateFlow` for UI state, `viewModelScope` for
 * coroutines, and `AppError` as the only exception type crossing
 * the boundary back to the View.
 */
class AuthViewModel(
    private val authApi: AuthApi,
    private val authSession: AuthSession,
) : ViewModel() {

    private val _state = MutableStateFlow(AuthUiState())
    val state: StateFlow<AuthUiState> = _state.asStateFlow()

    fun setEmail(value: String) {
        _state.update { it.copy(email = value, error = null) }
    }

    fun setPassword(value: String) {
        _state.update { it.copy(password = value, error = null) }
    }

    fun setDisplayName(value: String) {
        _state.update { it.copy(displayName = value, error = null) }
    }

    fun setLevel(value: Level) {
        _state.update { it.copy(level = value) }
    }

    fun setAgreedToTerms(value: Boolean) {
        _state.update { it.copy(agreedToTerms = value, termsError = if (value) false else it.termsError) }
    }

    fun signIn(onSuccess: () -> Unit) {
        viewModelScope.launch { signInInternal(onSuccess) }
    }

    fun signUp(onSuccess: () -> Unit) {
        viewModelScope.launch { signUpInternal(onSuccess) }
    }

    /**
     * Google sign-in. [getIdToken] runs the Credential Manager flow with
     * the server-issued nonce and returns the ID token, or null if the
     * user cancels. Kept as a parameter so the ViewModel stays free of
     * Android framework types and testable. Navigation on success is the
     * caller's; the session-flow observer flips the UI like the other
     * paths.
     */
    fun signInWithGoogle(getIdToken: suspend (nonce: String) -> String?, onSuccess: () -> Unit) {
        viewModelScope.launch { signInWithGoogleInternal(getIdToken, onSuccess) }
    }

    /** Suspending helper exposed for tests. */
    suspend fun signInWithGoogleInternal(
        getIdToken: suspend (nonce: String) -> String?,
        onSuccess: () -> Unit,
    ) {
        if (_state.value.pending) return
        _state.update { it.copy(pending = true, error = null) }
        try {
            val nonce = authApi.requestGoogleNonce()
            val idToken = getIdToken(nonce)
            if (idToken == null) {
                // User dismissed the Google sheet — not an error.
                _state.update { it.copy(pending = false) }
                return
            }
            val payload = authApi.signInWithGoogle(idToken)
            authSession.save(payload)
            _state.update { it.copy(pending = false) }
            onSuccess()
        } catch (cause: AppError) {
            _state.update { it.copy(pending = false, error = cause) }
        }
    }

    /** Suspending helper exposed for tests. */
    suspend fun signInInternal(onSuccess: () -> Unit) {
        val current = _state.value
        if (current.pending) return
        _state.update { it.copy(pending = true, error = null) }
        try {
            val payload = authApi.signIn(
                email = current.email.trim(),
                password = current.password,
            )
            authSession.save(payload)
            _state.update { it.copy(pending = false) }
            onSuccess()
        } catch (cause: AppError) {
            _state.update { it.copy(pending = false, error = cause) }
        }
    }

    /** Suspending helper exposed for tests. */
    suspend fun signUpInternal(onSuccess: () -> Unit) {
        val current = _state.value
        if (current.pending) return
        if (!current.agreedToTerms) {
            _state.update { it.copy(termsError = true) }
            return
        }
        _state.update { it.copy(pending = true, error = null, termsError = false) }
        try {
            val payload = authApi.signUp(
                email = current.email.trim(),
                password = current.password,
                displayName = current.displayName.trim().takeIf { it.isNotEmpty() },
            )
            authSession.save(payload)
            _state.update { it.copy(pending = false) }
            onSuccess()
        } catch (cause: AppError) {
            _state.update { it.copy(pending = false, error = cause) }
        }
    }
}
