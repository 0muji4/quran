package com.tilawah.android.backend

import com.apollographql.apollo.api.http.HttpRequest
import com.apollographql.apollo.api.http.HttpResponse
import com.apollographql.apollo.network.http.HttpInterceptor
import com.apollographql.apollo.network.http.HttpInterceptorChain
import com.tilawah.android.app.AppError
import com.tilawah.android.storage.AuthSession
import kotlinx.coroutines.flow.first

/**
 * Apollo [HttpInterceptor] that mirrors [DefaultAuthedHttpClient] for the
 * GraphQL surface: read the latest access token from [AuthSession],
 * attach it as `Authorization: Bearer <token>`, and on a 401 rotate
 * through [TokenRefresher] once before giving up.
 *
 * Why this exists: the REST clients (`AuthedHttpClient`) already
 * authenticate, but the Apollo client was constructed bare — so every
 * GraphQL mutation that touched user-scoped state silently hit the BFF
 * as anonymous and failed at the first `user_id NOT NULL` constraint.
 *
 * Behavioural mirror with [DefaultAuthedHttpClient]:
 *   - No stored session ⇒ request goes through *without* a header. The
 *     resolver decides what to do; surahs query stays public, anything
 *     auth-required surfaces a 401 from the BFF rather than a constraint
 *     violation deep inside a mutation.
 *   - `tokenRefresher == null` ⇒ no retry; the caller wraps 401 as a
 *     domain error.
 *   - Refresh raises [AppError.InvalidCredentials] ⇒ clear the local
 *     session so the UI can flip to signed-out on the next observation.
 *   - Retry also 401 ⇒ rotation succeeded but the BFF still says no;
 *     clear the session and throw [AppError.InvalidCredentials] rather
 *     than loop.
 */
class BearerAuthInterceptor(
    private val authSession: AuthSession,
    private val tokenRefresher: TokenRefresher? = null,
) : HttpInterceptor {

    override suspend fun intercept(
        request: HttpRequest,
        chain: HttpInterceptorChain,
    ): HttpResponse {
        val initialToken = authSession.sessionFlow().first()?.accessToken
        val first = chain.proceed(request.withBearer(initialToken))
        if (first.statusCode != 401 || tokenRefresher == null) {
            return first
        }

        // Consume the 401 body before retrying so the underlying transport
        // doesn't leak the response stream.
        first.body?.close()

        val rotated = try {
            tokenRefresher.refresh()
        } catch (cause: AppError.InvalidCredentials) {
            authSession.clear()
            throw cause
        }

        val second = chain.proceed(request.withBearer(rotated.accessToken))
        if (second.statusCode == 401) {
            second.body?.close()
            authSession.clear()
            throw AppError.InvalidCredentials
        }
        return second
    }

    private fun HttpRequest.withBearer(token: String?): HttpRequest =
        if (token == null) {
            this
        } else {
            newBuilder().addHeader("Authorization", "Bearer $token").build()
        }
}
