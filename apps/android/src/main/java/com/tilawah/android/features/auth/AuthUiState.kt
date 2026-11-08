package com.tilawah.android.features.auth

import androidx.compose.runtime.Immutable
import com.tilawah.android.app.AppError

/**
 * Snapshot consumed by `SignInScreen` / `SignUpScreen`. `displayName`,
 * `level`, and `agreedToTerms` are only read by the sign-up form;
 * `agreedToTerms` is not sent to the BFF.
 */
@Immutable
data class AuthUiState(
    val email: String = "",
    val password: String = "",
    val displayName: String = "",
    val level: Level = DefaultLevel,
    val agreedToTerms: Boolean = false,
    val termsError: Boolean = false,
    val pending: Boolean = false,
    val error: AppError? = null,
)
