package com.tilawah.android.backend

import com.tilawah.android.app.AppError
import com.tilawah.android.storage.AuthSession
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Coalesces concurrent `POST /auth/refresh` calls into a single
 * in-flight request and persists the rotated tokens to [AuthSession]
 * before returning.
 *
 * Why this exists: the BFF treats a re-presented refresh token as a
 * replay attack and revokes every outstanding token for the user
 * (`apps/bff/src/rest/rest.ts:232`). When several callers (e.g. an
 * Apollo query and a `AuthedHttpClient` REST call) each receive a 401
 * at roughly the same moment, they must all share one rotation —
 * otherwise the second redemption looks like a replay and signs the
 * user out.
 *
 * Mirrors `apps/ios/Sources/QuranRecitationApp/Backend/TokenRefresher.swift`.
 *
 * Refresh failure is bubbled as-is:
 * - [AppError.InvalidCredentials] = refresh token revoked / replayed,
 *   the HTTP retry layer signs the user out.
 * - [AppError.Network] / [AppError.BackendUnavailable] = transient,
 *   the caller surfaces without nuking the session.
 */
class TokenRefresher(
    private val authApi: AuthApi,
    private val authSession: AuthSession,
    private val scope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO),
) {
    private val mutex = Mutex()
    @Volatile
    private var inFlight: Deferred<RefreshedTokens>? = null

    /**
     * Returns a freshly rotated [RefreshedTokens]. Concurrent callers
     * share the same in-flight [Deferred], so only one
     * `POST /auth/refresh` fires per rotation window.
     */
    suspend fun refresh(): RefreshedTokens {
        // Fast path: an in-flight refresh is already running — join it.
        inFlight?.takeIf { it.isActive }?.let { return it.await() }

        // Slow path: start (or join, if a racing caller just started)
        // a refresh under the lock so we never spawn two networked
        // refreshes back-to-back.
        val deferred = mutex.withLock {
            inFlight?.takeIf { it.isActive } ?: scope.async { performRefresh() }
                .also { inFlight = it }
        }
        return try {
            deferred.await()
        } finally {
            // Only clear the slot if we're still the active task —
            // a newer one started in the meantime should remain.
            mutex.withLock {
                if (inFlight === deferred) inFlight = null
            }
        }
    }

    private suspend fun performRefresh(): RefreshedTokens {
        val current = authSession.sessionFlow().first()
            ?: throw AppError.InvalidCredentials
        val rotated = authApi.refresh(current.refreshToken)
        authSession.updateTokens(
            accessToken = rotated.accessToken,
            refreshToken = rotated.refreshToken,
        )
        return rotated
    }
}
