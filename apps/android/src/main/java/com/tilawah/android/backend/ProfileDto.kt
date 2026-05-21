package com.tilawah.android.backend

import kotlinx.serialization.Serializable

/**
 * Wire types for the BFF `/auth/me*` REST surface. Shape matches
 * `apps/bff/src/auth/routes.ts` and mirrors the iOS counterparts in
 * `apps/ios/Sources/QuranRecitationApp/Backend/ProfileService.swift`.
 *
 * Internal to the backend package — ViewModels only see [AuthUser]
 * through [ProfileService].
 */
@Serializable
internal data class MeResponseBody(
    val user: AuthUserDto,
)

@Serializable
internal data class PatchProfileBody(
    val displayName: String? = null,
    val level: String? = null,
)

@Serializable
internal data class ChangeEmailBody(
    val currentPassword: String,
    val newEmail: String,
)

@Serializable
internal data class ChangePasswordBody(
    val currentPassword: String,
    val newPassword: String,
)
