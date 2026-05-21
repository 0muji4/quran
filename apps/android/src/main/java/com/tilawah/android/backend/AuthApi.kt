package com.tilawah.android.backend

import com.tilawah.android.app.AppConfig
import com.tilawah.android.app.AppError
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

/**
 * REST surface for `POST /auth/signup` and `POST /auth/login`. Exposed
 * as an interface so the AuthViewModel can be tested with a fake
 * implementation while production uses [OkHttpAuthApi] against the BFF.
 *
 * Every transport-level failure crosses this boundary as an [AppError]
 * (the same convention [QuranBackend] follows; see ADR 0006).
 */
interface AuthApi {
    suspend fun signIn(email: String, password: String): AuthSessionPayload

    suspend fun signUp(
        email: String,
        password: String,
        displayName: String?,
    ): AuthSessionPayload

    /**
     * `POST /auth/refresh`. Trades [refreshToken] for a rotated pair.
     *
     * Throws [AppError.InvalidCredentials] on 401 — the refresh token
     * was revoked, replayed, or expired. The caller is expected to
     * drop the session and route the user back to sign-in.
     */
    suspend fun refresh(refreshToken: String): RefreshedTokens
}

/**
 * OkHttp + kotlinx-serialization implementation. Stays in this module
 * because the auth surface is two tiny endpoints; introducing Retrofit
 * for this would be a step backwards in dependency weight.
 */
class OkHttpAuthApi(
    private val baseUrl: String = AppConfig.restBaseUrl,
    private val httpClient: OkHttpClient = OkHttpClient(),
    private val json: Json = AuthJson,
) : AuthApi {

    override suspend fun signIn(email: String, password: String): AuthSessionPayload =
        post(
            path = "auth/login",
            body = json.encodeToString(SignInRequest.serializer(), SignInRequest(email, password)),
            operation = "signIn",
        )

    override suspend fun signUp(
        email: String,
        password: String,
        displayName: String?,
    ): AuthSessionPayload = post(
        path = "auth/signup",
        body = json.encodeToString(
            SignUpRequest.serializer(),
            SignUpRequest(email = email, password = password, displayName = displayName),
        ),
        operation = "signUp",
    )

    override suspend fun refresh(refreshToken: String): RefreshedTokens {
        val request = Request.Builder()
            .url("${baseUrl}auth/refresh")
            .post(
                json.encodeToString(
                    RefreshTokenRequest.serializer(),
                    RefreshTokenRequest(refreshToken),
                ).toRequestBody(JSON_MEDIA),
            )
            .build()
        return withContext(Dispatchers.IO) {
            try {
                httpClient.newCall(request).execute().use { response ->
                    val payload = response.body?.string().orEmpty()
                    when (response.code) {
                        in 200..299 -> parseRefresh(payload)
                        400 -> throw AppError.ValidationFailed(parseErrorMessage(payload) ?: "invalid input")
                        401 -> throw AppError.InvalidCredentials
                        in 500..599 -> throw AppError.BackendUnavailable("refresh")
                        else -> throw AppError.BackendUnavailable("refresh")
                    }
                }
            } catch (cause: AppError) {
                throw cause
            } catch (cause: IOException) {
                throw AppError.Network(cause)
            } catch (cause: Throwable) {
                throw AppError.BackendUnavailable("refresh", cause)
            }
        }
    }

    private fun parseRefresh(payload: String): RefreshedTokens =
        try {
            json.decodeFromString(RefreshResponseDto.serializer(), payload).let {
                RefreshedTokens(accessToken = it.accessToken, refreshToken = it.refreshToken)
            }
        } catch (_: SerializationException) {
            throw AppError.BackendUnavailable("refresh")
        }

    private suspend fun post(path: String, body: String, operation: String): AuthSessionPayload {
        val request = Request.Builder()
            .url("$baseUrl$path")
            .post(body.toRequestBody(JSON_MEDIA))
            .build()
        return withContext(Dispatchers.IO) {
            try {
                httpClient.newCall(request).execute().use { response ->
                    val payload = response.body?.string().orEmpty()
                    when (response.code) {
                        in 200..299 -> parseSuccess(payload, operation)
                        400 -> throw AppError.ValidationFailed(parseErrorMessage(payload) ?: "invalid input")
                        401 -> throw AppError.InvalidCredentials
                        409 -> throw AppError.EmailInUse
                        in 500..599 -> throw AppError.BackendUnavailable(operation)
                        else -> throw AppError.BackendUnavailable(operation)
                    }
                }
            } catch (cause: AppError) {
                throw cause
            } catch (cause: IOException) {
                throw AppError.Network(cause)
            } catch (cause: Throwable) {
                throw AppError.BackendUnavailable(operation, cause)
            }
        }
    }

    private fun parseSuccess(payload: String, operation: String): AuthSessionPayload =
        try {
            json.decodeFromString(AuthResponseDto.serializer(), payload).toFacade()
        } catch (_: SerializationException) {
            throw AppError.BackendUnavailable(operation)
        }

    private fun parseErrorMessage(payload: String): String? = try {
        json.decodeFromString(AuthErrorDto.serializer(), payload).error
    } catch (_: SerializationException) {
        null
    }

    private fun AuthResponseDto.toFacade(): AuthSessionPayload = AuthSessionPayload(
        accessToken = accessToken,
        refreshToken = refreshToken,
        user = AuthUser(
            id = user.id,
            email = user.email,
            displayName = user.displayName,
            createdAt = user.createdAt,
            level = user.level,
        ),
        reactivated = reactivated == true,
    )

    private companion object {
        val JSON_MEDIA = "application/json; charset=utf-8".toMediaType()
    }
}

/** Shared Json instance — matches the BFF's lenient JSON expectations. */
internal val AuthJson: Json = Json {
    ignoreUnknownKeys = true
    encodeDefaults = false
    explicitNulls = false
}
