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

    override fun sessionFlow(): Flow<StoredSession?> = state.asStateFlow()

    override suspend fun save(payload: AuthSessionPayload) {
        state.value = payload.toStored()
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

    override suspend fun clear() {
        state.value = null
    }
}
