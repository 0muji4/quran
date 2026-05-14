package com.tilawah.android.features.auth

import androidx.compose.runtime.Immutable
import com.tilawah.android.app.AppError

/**
 * Snapshot consumed by `SignInScreen` / `SignUpScreen`. Fields shared
 * across both modes live here; sign-up-only fields (`displayName`,
 * `level`, terms) are added in the PR that lights up the sign-up form.
 */
@Immutable
data class AuthUiState(
    val email: String = "",
    val password: String = "",
    val pending: Boolean = false,
    val error: AppError? = null,
)
