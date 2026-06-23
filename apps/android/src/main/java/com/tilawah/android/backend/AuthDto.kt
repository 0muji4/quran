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
    val reactivated: Boolean? = null,
)

@Serializable
internal data class AuthUserDto(
    val id: String,
    val email: String,
    val displayName: String? = null,
    val createdAt: String? = null,
    val level: String? = null,
)

@Serializable
internal data class GoogleSignInRequest(
    val idToken: String,
)

@Serializable
internal data class NonceResponseDto(
    val nonce: String,
)

@Serializable
internal data class RefreshTokenRequest(
    val refreshToken: String,
)

@Serializable
internal data class RefreshResponseDto(
    val accessToken: String,
    val refreshToken: String,
)

/**
 * Result of a successful `POST /auth/refresh`. Just the rotated token
 * pair — the BFF doesn't return the user shape on refresh, so the
 * existing in-memory session still holds it.
 */
data class RefreshedTokens(
    val accessToken: String,
    val refreshToken: String,
)

@Serializable
internal data class AuthErrorDto(
    val error: String? = null,
)

/**
 * ViewModel-facing user record. Strips wire-only fields.
 *
 * `createdAt` and `level` are populated by `GET /auth/me` and round-trip
 * through `/auth/login` and `/auth/signup` when the BFF includes them;
 * both stay nullable so older persisted sessions (saved before this
 * shape landed) decode cleanly.
 */
data class AuthUser(
    val id: String,
    val email: String,
    val displayName: String?,
    val createdAt: String? = null,
    val level: String? = null,
)

/**
 * ViewModel-facing auth result.
 *
 * `reactivated` is `true` when the BFF resurrected a soft-deleted row
 * during sign-in (ADR-0024 §4). The flag flows from `AuthApi` into
 * `AuthSession` so the Profile tab can show a one-shot "Welcome back"
 * banner without re-fetching the user.
 */
data class AuthSessionPayload(
    val accessToken: String,
    val refreshToken: String,
    val user: AuthUser,
    val reactivated: Boolean = false,
)
