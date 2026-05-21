package com.tilawah.android.storage

import com.tilawah.android.backend.AuthSessionPayload
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Process-lifetime [AuthSession]. Used as the DataStore-failure fallback
 * in [com.tilawah.android.MainActivity] (mirrors the same approach in
 * [InMemoryHistoryStore]) and as the default in tests.
 */
class InMemoryAuthSession : AuthSession {

    private val state = MutableStateFlow<StoredSession?>(null)
    private val notice = MutableStateFlow(false)

    override fun sessionFlow(): Flow<StoredSession?> = state.asStateFlow()

    override fun reactivationNotice(): Flow<Boolean> = notice.asStateFlow()

    override suspend fun save(payload: AuthSessionPayload) {
        state.value = payload.toStored()
        // Only flip the notice ON when a reactivating sign-in arrives;
        // a non-reactivating one must not clear a still-pending notice
        // from a prior sign-in (the UI is expected to acknowledge it).
        if (payload.reactivated) notice.value = true
    }

    override suspend fun updateUser(user: com.tilawah.android.backend.AuthUser) {
        val current = state.value ?: return
        state.value = current.copy(
            user = StoredAuthUser(
                id = user.id,
                email = user.email,
                displayName = user.displayName,
                createdAt = user.createdAt,
                level = user.level,
            ),
        )
    }

    override suspend fun acknowledgeReactivationNotice() {
        notice.value = false
    }

    override suspend fun updateTokens(accessToken: String, refreshToken: String) {
        val current = state.value ?: return
        state.value = current.copy(accessToken = accessToken, refreshToken = refreshToken)
    }

    override suspend fun clear() {
        state.value = null
        notice.value = false
    }
}
