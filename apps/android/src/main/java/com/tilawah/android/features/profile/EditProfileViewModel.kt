package com.tilawah.android.features.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tilawah.android.app.AppError
import com.tilawah.android.backend.AuthUser
import com.tilawah.android.backend.ProfileService
import com.tilawah.android.storage.AuthSession
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Backs the Edit Profile sheet. Owns `displayName` / `level` inputs,
 * the submit lifecycle, and propagates the BFF's refreshed user shape
 * back into [AuthSession] so the Profile header repaints without a
 * re-sign-in.
 *
 * Mirrors `apps/ios/Sources/QuranRecitationApp/Features/Profile/EditProfileViewModel.swift`.
 */
class EditProfileViewModel(
    initialUser: AuthUser,
    private val profileService: ProfileService,
    private val authSession: AuthSession,
) : ViewModel() {

    private val initialDisplayName: String = (initialUser.displayName ?: "").trim()
    private val initialLevel: String? = initialUser.level

    private val _state = MutableStateFlow(
        EditProfileUiState(
            displayName = initialDisplayName,
            level = initialLevel,
            status = EditProfileStatus.Idle,
        ),
    )
    val state: StateFlow<EditProfileUiState> = _state.asStateFlow()

    fun setDisplayName(value: String) {
        _state.update { current ->
            current.copy(
                displayName = value,
                status = if (current.status is EditProfileStatus.Error) EditProfileStatus.Idle else current.status,
            )
        }
    }

    fun setLevel(value: String?) {
        _state.update { current ->
            current.copy(
                level = value,
                status = if (current.status is EditProfileStatus.Error) EditProfileStatus.Idle else current.status,
            )
        }
    }

    fun clearError() {
        _state.update { current ->
            if (current.status is EditProfileStatus.Error) {
                current.copy(status = EditProfileStatus.Idle)
            } else {
                current
            }
        }
    }

    /**
     * Returns true on success so the caller can dismiss the sheet.
     * Leaves the sheet open with an error banner on failure.
     */
    fun submit(onSuccess: () -> Unit) {
        val snapshot = _state.value
        if (!snapshot.canSubmit(initialDisplayName, initialLevel)) return

        _state.update { it.copy(status = EditProfileStatus.Submitting) }
        viewModelScope.launch {
            val trimmed = snapshot.displayName.trim()
            // `null` here means "leave the column alone" — we never echo
            // an unchanged value through the PATCH, matching iOS.
            val displayDelta = if (trimmed != initialDisplayName) trimmed else null
            val levelDelta = if (snapshot.level != initialLevel) snapshot.level else null

            try {
                val refreshed = profileService.updateProfile(
                    displayName = displayDelta,
                    level = levelDelta,
                )
                authSession.updateUser(refreshed)
                _state.update { it.copy(status = EditProfileStatus.Idle) }
                onSuccess()
            } catch (cause: AppError) {
                _state.update { it.copy(status = EditProfileStatus.Error(messageFor(cause))) }
            } catch (cause: Throwable) {
                _state.update { it.copy(status = EditProfileStatus.Error(FALLBACK_MESSAGE)) }
            }
        }
    }

    private fun messageFor(error: AppError): String = when (error) {
        is AppError.ValidationFailed -> "Please check the form and try again."
        is AppError.Network -> "Network error. Check your connection and try again."
        AppError.InvalidCredentials -> "Your session has expired. Sign in again."
        else -> FALLBACK_MESSAGE
    }

    private companion object {
        const val FALLBACK_MESSAGE = "Couldn't save changes. Try again."
    }
}

/**
 * UI state for the Edit Profile sheet. `hasChanges` and `canSubmit`
 * derive from a pair of "initial" values held by the ViewModel rather
 * than living in the state itself — the state stays a pure snapshot
 * that the Composable observes.
 */
data class EditProfileUiState(
    val displayName: String,
    val level: String?,
    val status: EditProfileStatus,
) {

    val isSubmitting: Boolean
        get() = status is EditProfileStatus.Submitting

    fun hasChanges(initialDisplayName: String, initialLevel: String?): Boolean {
        val trimmed = displayName.trim()
        return trimmed != initialDisplayName || level != initialLevel
    }

    fun canSubmit(initialDisplayName: String, initialLevel: String?): Boolean {
        if (isSubmitting) return false
        if (!hasChanges(initialDisplayName, initialLevel)) return false
        val trimmed = displayName.trim()
        // BFF zod rejects an empty displayName and we have no UX for
        // clearing a name; keep Save disabled rather than land in 400.
        if (initialDisplayName.isNotEmpty() && trimmed.isEmpty()) return false
        return true
    }
}

sealed class EditProfileStatus {
    data object Idle : EditProfileStatus()
    data object Submitting : EditProfileStatus()
    data class Error(val message: String) : EditProfileStatus()
}

/**
 * Level vocabulary accepted by the BFF zod schema
 * (`apps/bff/src/auth/users.ts:VALID_LEVELS`). Kept here as raw strings
 * so the wire mapping lives in one place.
 */
val EditProfileLevelOptions: List<String> = listOf("beginner", "intermediate", "advanced")
