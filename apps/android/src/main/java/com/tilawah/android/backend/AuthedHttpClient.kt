package com.tilawah.android.backend

import com.tilawah.android.storage.AuthSession
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response

/**
 * Authenticated HTTP transport for the BFF REST surface.
 *
 * Production [DefaultAuthedHttpClient] reads the latest access token
 * from [AuthSession] and attaches it as `Authorization: Bearer <token>`
 * on every outbound request. Callers receive the raw [Response] so they
 * can map domain status codes (400 / 404 / 409 / 422 / …) themselves.
 *
 * Mirrors the seam iOS exposes via `AuthHTTPClient.send(URLRequest)`
 * (`apps/ios/Sources/QuranRecitationApp/Backend/AuthHTTPClient.swift`).
 * The 401 rotate-and-retry path lives in a follow-up `TokenRefresher`
 * (Phase 2 PR6) — until that lands, a 401 surfaces to the caller as a
 * plain HTTP response and the ViewModel surfaces it as a re-sign-in
 * prompt.
 */
interface AuthedHttpClient {
    /**
     * Send [request] with the current access token attached. Throws
     * [com.tilawah.android.app.AppError.InvalidCredentials] when no
     * session is stored — that condition is unrecoverable here, so the
     * caller is expected to route the user back to sign-in rather than
     * retry.
     */
    suspend fun send(request: Request): Response
}

class DefaultAuthedHttpClient(
    private val authSession: AuthSession,
    private val httpClient: OkHttpClient = OkHttpClient(),
) : AuthedHttpClient {

    override suspend fun send(request: Request): Response {
        val accessToken = authSession.sessionFlow().first()?.accessToken
            ?: throw com.tilawah.android.app.AppError.InvalidCredentials

        val authed = request.newBuilder()
            .header("Authorization", "Bearer $accessToken")
            .build()

        return withContext(Dispatchers.IO) {
            httpClient.newCall(authed).execute()
        }
    }
}
