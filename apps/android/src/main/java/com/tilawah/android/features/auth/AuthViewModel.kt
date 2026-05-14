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

    fun signIn(onSuccess: () -> Unit) {
        viewModelScope.launch { signInInternal(onSuccess) }
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
}
