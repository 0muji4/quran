package com.tilawah.android.backend

import com.tilawah.android.app.AppError
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
 * When a [TokenRefresher] is wired in, a 401 response triggers a single
 * rotate-and-retry: the refresh is coalesced across concurrent callers
 * by [TokenRefresher], the request is replayed with the new access
 * token, and only a second 401 (or a confirmed refresh failure) drops
 * the session.
 *
 * Mirrors the seam iOS exposes via `AuthHTTPClient.send(URLRequest)`
 * (`apps/ios/Sources/QuranRecitationApp/Backend/AuthHTTPClient.swift`).
 */
interface AuthedHttpClient {
    /**
     * Send [request] with the current access token attached. Throws
     * [AppError.InvalidCredentials] when no session is stored or when
     * the rotated token is also rejected — that condition is
     * unrecoverable here, so the caller is expected to route the user
     * back to sign-in rather than retry.
     */
    suspend fun send(request: Request): Response
}

class DefaultAuthedHttpClient(
    private val authSession: AuthSession,
    private val httpClient: OkHttpClient = OkHttpClient(),
    private val tokenRefresher: TokenRefresher? = null,
) : AuthedHttpClient {

    override suspend fun send(request: Request): Response {
        val accessToken = authSession.sessionFlow().first()?.accessToken
            ?: throw AppError.InvalidCredentials

        val first = execute(request, accessToken)
        if (first.code != 401 || tokenRefresher == null) {
            return first
        }
        // Consume the 401 body before retrying — leaving it open holds
        // the connection and trips OkHttp's "response body left open"
        // guard on the next call.
        first.close()

        val rotated = try {
            tokenRefresher.refresh()
        } catch (cause: AppError.InvalidCredentials) {
            // Refresh token revoked / replayed → the session is dead.
            // Drop it locally so the UI flips back to the signed-out
            // shell on the next observation.
            authSession.clear()
            throw cause
        } catch (cause: AppError) {
            // Transient (network / 5xx). Let the caller surface it
            // without stranding the user.
            throw cause
        }

        val second = execute(request, rotated.accessToken)
        if (second.code == 401) {
            // Rotation succeeded but the BFF still says no — treat as
            // a confirmed sign-out rather than looping.
            second.close()
            authSession.clear()
            throw AppError.InvalidCredentials
        }
        return second
    }

    private suspend fun execute(request: Request, accessToken: String): Response {
        val authed = request.newBuilder()
            .header("Authorization", "Bearer $accessToken")
            .build()
        return withContext(Dispatchers.IO) {
            httpClient.newCall(authed).execute()
        }
    }
}
