package com.tilawah.android.backend

import kotlinx.serialization.Serializable

/**
 * Wire types for `POST /auth/signup` and `POST /auth/login`. Shape
 * matches `apps/bff/src/auth/routes.ts`. Internal to the backend
 * package — ViewModels only see [AuthUser] and [AuthSessionPayload]
 * through [AuthApi].
 */
@Serializable
internal data class SignInRequest(
    val email: String,
    val password: String,
)

@Serializable
internal data class SignUpRequest(
    val email: String,
    val password: String,
    val displayName: String? = null,
)

@Serializable
internal data class AuthResponseDto(
    val accessToken: String,
    val refreshToken: String,
    val user: AuthUserDto,
)

@Serializable
internal data class AuthUserDto(
    val id: String,
    val email: String,
    val displayName: String? = null,
)

@Serializable
internal data class AuthErrorDto(
    val error: String? = null,
)

/** ViewModel-facing user record. Strips wire-only fields. */
data class AuthUser(
    val id: String,
    val email: String,
    val displayName: String?,
)

/** ViewModel-facing auth result. */
data class AuthSessionPayload(
    val accessToken: String,
    val refreshToken: String,
    val user: AuthUser,
)
