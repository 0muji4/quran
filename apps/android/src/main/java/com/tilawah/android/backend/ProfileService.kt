package com.tilawah.android.backend

import com.tilawah.android.app.AppConfig
import com.tilawah.android.app.AppError
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

/**
 * REST surface for the signed-in user's own profile
 * (`/auth/me`, `/auth/me/email`, `/auth/me/password`).
 *
 * Kept distinct from [AuthApi] (which fronts the unauthenticated
 * `/auth/login` and `/auth/signup`) so the two concerns don't share a
 * single fat interface: every method here requires a Bearer token via
 * [AuthedHttpClient], while [AuthApi] calls run unauthenticated against
 * the public surface. Both are REST rather than GraphQL per ADR 0010.
 *
 * Mirrors `apps/ios/Sources/QuranRecitationApp/Backend/ProfileService.swift`.
 * Errors cross this boundary as [AppError] (see ADR 0006).
 */
interface ProfileService {

    /**
     * `GET /auth/me`. Returns the current snapshot so long-lived UI can
     * refresh `createdAt` / `level` / `displayName` without forcing a
     * sign-in round-trip.
     */
    suspend fun fetchCurrentUser(): AuthUser

    /**
     * `PATCH /auth/me`. `displayName = null` and `level = null` mean
     * "don't touch that column" — distinct from `""` (cleared) which the
     * BFF zod schema currently rejects with 400. At least one non-null
     * field is required; an all-null call short-circuits to
     * [fetchCurrentUser] so we don't spend a round trip on a no-op.
     */
    suspend fun updateProfile(displayName: String?, level: String?): AuthUser

    /**
     * `POST /auth/me/email`. The BFF re-verifies [currentPassword]
     * before rotating. Throws [AppError.InvalidCredentials] on a wrong
     * current password, [AppError.EmailInUse] if another live row
     * already holds the new address. No confirmation email is sent
     * (Phase 2.C-lite).
     */
    suspend fun updateEmail(currentPassword: String, newEmail: String): AuthUser

    /**
     * `POST /auth/me/password`. Same `.invalidCredentials` mapping as
     * [updateEmail] for the wrong-current-password path. The BFF does
     * not revoke other devices' refresh tokens, so the local session
     * stays signed in across the rotation.
     */
    suspend fun updatePassword(currentPassword: String, newPassword: String)

    /**
     * `DELETE /auth/me`. Soft-deletes per ADR 0024: the row enters the
     * 30-day grace window and a subsequent sign-in within the window
     * reactivates it. The caller is expected to clear local session
     * state on success.
     */
    suspend fun deleteAccount()
}

/**
 * OkHttp + kotlinx-serialization implementation backed by an
 * [AuthedHttpClient] so the Bearer token is attached uniformly.
 */
class HttpProfileService(
    private val http: AuthedHttpClient,
    private val baseUrl: String = AppConfig.restBaseUrl,
    private val json: Json = ProfileJson,
) : ProfileService {

    override suspend fun fetchCurrentUser(): AuthUser =
        execute(
            request = Request.Builder()
                .url("${baseUrl}auth/me")
                .header("Accept", "application/json")
                .get()
                .build(),
            operation = "profile.fetch",
            parseSuccess = ::parseUser,
        )

    override suspend fun updateProfile(displayName: String?, level: String?): AuthUser {
        if (displayName == null && level == null) {
            return fetchCurrentUser()
        }
        val body = json.encodeToString(
            PatchProfileBody.serializer(),
            PatchProfileBody(displayName = displayName, level = level),
        )
        return execute(
            request = Request.Builder()
                .url("${baseUrl}auth/me")
                .header("Accept", "application/json")
                .patch(body.toRequestBody(JSON_MEDIA))
                .build(),
            operation = "profile.update",
            parseSuccess = ::parseUser,
        )
    }

    override suspend fun updateEmail(currentPassword: String, newEmail: String): AuthUser {
        val body = json.encodeToString(
            ChangeEmailBody.serializer(),
            ChangeEmailBody(currentPassword = currentPassword, newEmail = newEmail),
        )
        return execute(
            request = Request.Builder()
                .url("${baseUrl}auth/me/email")
                .header("Accept", "application/json")
                .post(body.toRequestBody(JSON_MEDIA))
                .build(),
            operation = "profile.email",
            parseSuccess = ::parseUser,
        )
    }

    override suspend fun updatePassword(currentPassword: String, newPassword: String) {
        val body = json.encodeToString(
            ChangePasswordBody.serializer(),
            ChangePasswordBody(currentPassword = currentPassword, newPassword = newPassword),
        )
        execute(
            request = Request.Builder()
                .url("${baseUrl}auth/me/password")
                .header("Accept", "application/json")
                .post(body.toRequestBody(JSON_MEDIA))
                .build(),
            operation = "profile.password",
            parseSuccess = { _, _ -> Unit },
        )
    }

    override suspend fun deleteAccount() {
        execute(
            request = Request.Builder()
                .url("${baseUrl}auth/me")
                .header("Accept", "application/json")
                .delete()
                .build(),
            operation = "profile.delete",
            parseSuccess = { _, _ -> Unit },
        )
    }

    private suspend fun <T> execute(
        request: Request,
        operation: String,
        parseSuccess: (payload: String, operation: String) -> T,
    ): T {
        val response = try {
            http.send(request)
        } catch (cause: AppError) {
            throw cause
        } catch (cause: IOException) {
            throw AppError.Network(cause)
        } catch (cause: Throwable) {
            throw AppError.BackendUnavailable(operation, cause)
        }
        return response.use { resp ->
            val payload = resp.body?.string().orEmpty()
            when (resp.code) {
                in 200..299 -> parseSuccess(payload, operation)
                400 -> throw AppError.ValidationFailed(parseErrorMessage(payload) ?: "invalid input")
                // 401 means the access token is no longer good. Until
                // TokenRefresher lands (PR6) the caller surfaces it as a
                // re-sign-in prompt; profile re-verification failures
                // (wrong current password) come back as 422 instead, so
                // 401 here is never overloaded with a domain meaning.
                401 -> throw AppError.InvalidCredentials
                409 -> throw AppError.EmailInUse
                422 -> throw AppError.InvalidCredentials
                else -> throw AppError.BackendUnavailable(operation)
            }
        }
    }

    private fun parseUser(payload: String, operation: String): AuthUser =
        try {
            val dto = json.decodeFromString(MeResponseBody.serializer(), payload).user
            AuthUser(
                id = dto.id,
                email = dto.email,
                displayName = dto.displayName,
                createdAt = dto.createdAt,
                level = dto.level,
            )
        } catch (_: SerializationException) {
            throw AppError.BackendUnavailable("$operation.parse")
        }

    private fun parseErrorMessage(payload: String): String? = try {
        json.decodeFromString(AuthErrorDto.serializer(), payload).error
    } catch (_: SerializationException) {
        null
    }

    private companion object {
        val JSON_MEDIA = "application/json; charset=utf-8".toMediaType()
    }
}

/** Shared Json instance — matches the BFF's lenient JSON expectations. */
internal val ProfileJson: Json = Json {
    ignoreUnknownKeys = true
    encodeDefaults = false
    explicitNulls = false
}
