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
 * Backs the Change Email sheet. Drives `POST /auth/me/email`
 * (Phase 2.C-lite — no confirmation email is sent; the BFF trusts
 * the re-verified current password as proof of intent).
 *
 * On success the refreshed [com.tilawah.android.backend.AuthUser] lands
 * back in [AuthSession] so the Profile header repaints without forcing
 * a re-sign-in. Mirrors `apps/ios/.../Profile/ChangeEmailViewModel.swift`.
 */
class ChangeEmailViewModel(
    private val currentEmail: String,
    private val profileService: ProfileService,
    private val authSession: AuthSession,
) : ViewModel() {

    private val _state = MutableStateFlow(
        ChangeEmailUiState(
            currentPassword = "",
            newEmail = "",
            status = ChangeEmailStatus.Idle,
        ),
    )
    val state: StateFlow<ChangeEmailUiState> = _state.asStateFlow()

    fun setCurrentPassword(value: String) {
        _state.update { current ->
            current.copy(
                currentPassword = value,
                status = if (current.status is ChangeEmailStatus.Error) ChangeEmailStatus.Idle else current.status,
            )
        }
    }

    fun setNewEmail(value: String) {
        _state.update { current ->
            current.copy(
                newEmail = value,
                status = if (current.status is ChangeEmailStatus.Error) ChangeEmailStatus.Idle else current.status,
            )
        }
    }

    fun clearError() {
        _state.update { current ->
            if (current.status is ChangeEmailStatus.Error) current.copy(status = ChangeEmailStatus.Idle)
            else current
        }
    }

    /**
     * Same preflight as iOS — keeps the user from spending a round trip
     * on obvious typos. The BFF zod schema is the authoritative
     * validator.
     */
    fun preflightError(): String? {
        val snapshot = _state.value
        if (snapshot.currentPassword.isEmpty()) return "Enter your current password."
        val trimmed = snapshot.newEmail.trim()
        if (trimmed.isEmpty()) return "Enter a new email address."
        if (!isPlausibleEmail(trimmed)) return "Enter a valid email address."
        if (trimmed.equals(currentEmail, ignoreCase = true)) {
            return "New email must be different from your current one."
        }
        return null
    }

    fun canSubmit(): Boolean = !_state.value.isSubmitting && preflightError() == null

    fun submit(onSuccess: () -> Unit) {
        val validation = preflightError()
        if (validation != null) {
            _state.update { it.copy(status = ChangeEmailStatus.Error(validation)) }
            return
        }
        val snapshot = _state.value
        if (snapshot.isSubmitting) return

        _state.update { it.copy(status = ChangeEmailStatus.Submitting) }
        viewModelScope.launch {
            try {
                val refreshed = profileService.updateEmail(
                    currentPassword = snapshot.currentPassword,
                    newEmail = snapshot.newEmail.trim(),
                )
                authSession.updateUser(refreshed)
                _state.update { it.copy(status = ChangeEmailStatus.Idle) }
                onSuccess()
            } catch (cause: AppError) {
                _state.update { it.copy(status = ChangeEmailStatus.Error(messageFor(cause))) }
            } catch (_: Throwable) {
                _state.update { it.copy(status = ChangeEmailStatus.Error(FALLBACK_MESSAGE)) }
            }
        }
    }

    private fun messageFor(error: AppError): String = when (error) {
        // ProfileService maps the BFF's 422 ("current password is
        // incorrect") to InvalidCredentials so this branch covers the
        // re-verification failure without conflating it with an
        // expired-token sign-out.
        AppError.InvalidCredentials -> "Current password is incorrect."
        AppError.EmailInUse -> "An account with this email already exists."
        is AppError.ValidationFailed -> "Please check the form and try again."
        is AppError.Network -> "Network error. Check your connection and try again."
        else -> FALLBACK_MESSAGE
    }

    private companion object {
        const val FALLBACK_MESSAGE = "Couldn't update email. Try again."

        /**
         * Minimal local-part@domain.tld check matching the iOS regex.
         * The BFF zod schema does the authoritative validation; this
         * only blocks obvious typos so the user gets feedback before
         * spending a network round-trip.
         */
        private val emailRegex = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")

        fun isPlausibleEmail(value: String): Boolean = emailRegex.matches(value)
    }
}

data class ChangeEmailUiState(
    val currentPassword: String,
    val newEmail: String,
    val status: ChangeEmailStatus,
) {
    val isSubmitting: Boolean
        get() = status is ChangeEmailStatus.Submitting
}

sealed class ChangeEmailStatus {
    data object Idle : ChangeEmailStatus()
    data object Submitting : ChangeEmailStatus()
    data class Error(val message: String) : ChangeEmailStatus()
}
