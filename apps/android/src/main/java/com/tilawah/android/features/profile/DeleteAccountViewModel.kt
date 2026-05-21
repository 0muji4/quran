package com.tilawah.android.features.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tilawah.android.app.AppError
import com.tilawah.android.backend.ProfileService
import com.tilawah.android.storage.AuthSession
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Backs the Delete Account confirmation sheet. Drives `DELETE /auth/me`
 * (soft delete per ADR-0024). On a successful submit the local session
 * is cleared via [AuthSession.clear] so the UI flips back to the
 * signed-out shell; the row stays in the BFF database for 30 days,
 * after which the purge job removes it permanently.
 *
 * The local sign-out happens here rather than the caller so a
 * successful BFF call can't be followed by a UI path that leaves the
 * user signed in with a soft-deleted row (would surface as immediate
 * 401s on the next request).
 *
 * Mirrors `apps/ios/.../Profile/DeleteAccountViewModel.swift`.
 */
class DeleteAccountViewModel(
    private val profileService: ProfileService,
    private val authSession: AuthSession,
) : ViewModel() {

    private val _state = MutableStateFlow(
        DeleteAccountUiState(confirmText = "", status = DeleteAccountStatus.Idle),
    )
    val state: StateFlow<DeleteAccountUiState> = _state.asStateFlow()

    fun setConfirmText(value: String) {
        _state.update { current ->
            current.copy(
                confirmText = value,
                status = if (current.status is DeleteAccountStatus.Error) DeleteAccountStatus.Idle else current.status,
            )
        }
    }

    fun clearError() {
        _state.update { current ->
            if (current.status is DeleteAccountStatus.Error) current.copy(status = DeleteAccountStatus.Idle)
            else current
        }
    }

    fun canSubmit(): Boolean = !_state.value.isSubmitting &&
        _state.value.confirmText == CONFIRMATION_PHRASE

    fun submit(onSuccess: () -> Unit) {
        val snapshot = _state.value
        if (snapshot.confirmText != CONFIRMATION_PHRASE) {
            _state.update { it.copy(status = DeleteAccountStatus.Error(PREFLIGHT_MESSAGE)) }
            return
        }
        if (snapshot.isSubmitting) return

        _state.update { it.copy(status = DeleteAccountStatus.Submitting) }
        viewModelScope.launch {
            try {
                profileService.deleteAccount()
                authSession.clear()
                _state.update { it.copy(status = DeleteAccountStatus.Idle) }
                onSuccess()
            } catch (cause: AppError) {
                _state.update { it.copy(status = DeleteAccountStatus.Error(messageFor(cause))) }
            } catch (_: Throwable) {
                _state.update { it.copy(status = DeleteAccountStatus.Error(FALLBACK_MESSAGE)) }
            }
        }
    }

    private fun messageFor(error: AppError): String = when (error) {
        // The DELETE endpoint never returns 422; a 401 surfacing here
        // means the token path is dead — the parent's session observer
        // will tear the sheet down momentarily, but show neutral copy
        // rather than nothing in the meantime.
        AppError.InvalidCredentials -> "Your session has expired. Sign in again."
        is AppError.Network -> "Network error. Check your connection and try again."
        else -> FALLBACK_MESSAGE
    }

    companion object {
        /**
         * The phrase the user must type to enable the destructive button.
         * Strict equality (case-sensitive, no trim) keeps the action
         * deliberate — matches iOS and web. The phrase is intentionally
         * uppercase to feel weighty.
         */
        const val CONFIRMATION_PHRASE: String = "DELETE"

        const val PREFLIGHT_MESSAGE: String = "Type DELETE to confirm."
        private const val FALLBACK_MESSAGE: String = "Couldn't delete your account. Try again."
    }
}

data class DeleteAccountUiState(
    val confirmText: String,
    val status: DeleteAccountStatus,
) {
    val isSubmitting: Boolean
        get() = status is DeleteAccountStatus.Submitting
}

sealed class DeleteAccountStatus {
    data object Idle : DeleteAccountStatus()
    data object Submitting : DeleteAccountStatus()
    data class Error(val message: String) : DeleteAccountStatus()
}
