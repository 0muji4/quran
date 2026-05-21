package com.tilawah.android.features.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tilawah.android.app.AppError
import com.tilawah.android.backend.ProfileService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Backs the Update Password sheet. Owns the three input fields, the
 * client-side preflight rules, and the submit lifecycle. Mirrors the
 * iOS `UpdatePasswordViewModel` and the web `UpdatePasswordButton`
 * modal — every preflight rule here also runs server-side (BFF zod +
 * `verifyPassword`), so the client checks are UX guards rather than
 * security boundaries.
 *
 * No session-store write on success: the BFF deliberately leaves
 * refresh tokens alive across the rotation so a user can change their
 * password without being signed out on every device. The sheet just
 * dismisses.
 */
class UpdatePasswordViewModel(
    private val profileService: ProfileService,
) : ViewModel() {

    private val _state = MutableStateFlow(
        UpdatePasswordUiState(
            currentPassword = "",
            newPassword = "",
            confirmPassword = "",
            status = UpdatePasswordStatus.Idle,
        ),
    )
    val state: StateFlow<UpdatePasswordUiState> = _state.asStateFlow()

    fun setCurrentPassword(value: String) = updateField { it.copy(currentPassword = value) }
    fun setNewPassword(value: String) = updateField { it.copy(newPassword = value) }
    fun setConfirmPassword(value: String) = updateField { it.copy(confirmPassword = value) }

    fun clearError() {
        _state.update { current ->
            if (current.status is UpdatePasswordStatus.Error) current.copy(status = UpdatePasswordStatus.Idle)
            else current
        }
    }

    private fun updateField(mutate: (UpdatePasswordUiState) -> UpdatePasswordUiState) {
        _state.update { current ->
            val next = mutate(current)
            if (next.status is UpdatePasswordStatus.Error) next.copy(status = UpdatePasswordStatus.Idle)
            else next
        }
    }

    fun preflightError(): String? {
        val snapshot = _state.value
        if (snapshot.currentPassword.isEmpty()) {
            return "Enter your current password."
        }
        if (snapshot.newPassword.length < MIN_NEW_PASSWORD_LENGTH) {
            return "New password must be at least $MIN_NEW_PASSWORD_LENGTH characters."
        }
        if (snapshot.newPassword != snapshot.confirmPassword) {
            return "New password and confirmation don't match."
        }
        if (snapshot.newPassword == snapshot.currentPassword) {
            return "New password must be different from the current one."
        }
        return null
    }

    fun canSubmit(): Boolean = !_state.value.isSubmitting && preflightError() == null

    fun submit(onSuccess: () -> Unit) {
        val validation = preflightError()
        if (validation != null) {
            _state.update { it.copy(status = UpdatePasswordStatus.Error(validation)) }
            return
        }
        val snapshot = _state.value
        if (snapshot.isSubmitting) return

        _state.update { it.copy(status = UpdatePasswordStatus.Submitting) }
        viewModelScope.launch {
            try {
                profileService.updatePassword(
                    currentPassword = snapshot.currentPassword,
                    newPassword = snapshot.newPassword,
                )
                _state.update { it.copy(status = UpdatePasswordStatus.Idle) }
                onSuccess()
            } catch (cause: AppError) {
                _state.update { it.copy(status = UpdatePasswordStatus.Error(messageFor(cause))) }
            } catch (_: Throwable) {
                _state.update { it.copy(status = UpdatePasswordStatus.Error(FALLBACK_MESSAGE)) }
            }
        }
    }

    private fun messageFor(error: AppError): String = when (error) {
        // ProfileService maps the BFF's 422 ("current password is
        // incorrect") to InvalidCredentials. The expired-token 401
        // path is handled separately, so this branch is unambiguously
        // the wrong-current-password case.
        AppError.InvalidCredentials -> "Current password is incorrect."
        is AppError.ValidationFailed -> "Please check the form and try again."
        is AppError.Network -> "Network error. Check your connection and try again."
        else -> FALLBACK_MESSAGE
    }

    private companion object {
        /**
         * Minimum length enforced here and by the BFF zod schema on
         * `/auth/signup`. Keep in lockstep — see
         * `apps/bff/src/auth/routes.ts`.
         */
        const val MIN_NEW_PASSWORD_LENGTH = 8
        const val FALLBACK_MESSAGE = "Couldn't update password. Try again."
    }
}

data class UpdatePasswordUiState(
    val currentPassword: String,
    val newPassword: String,
    val confirmPassword: String,
    val status: UpdatePasswordStatus,
) {
    val isSubmitting: Boolean
        get() = status is UpdatePasswordStatus.Submitting
}

sealed class UpdatePasswordStatus {
    data object Idle : UpdatePasswordStatus()
    data object Submitting : UpdatePasswordStatus()
    data class Error(val message: String) : UpdatePasswordStatus()
}
