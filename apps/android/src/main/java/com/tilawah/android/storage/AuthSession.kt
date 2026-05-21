package com.tilawah.android.storage

import com.tilawah.android.backend.AuthSessionPayload
import com.tilawah.android.backend.AuthUser
import kotlinx.coroutines.flow.Flow
import kotlinx.serialization.Serializable

/**
 * Persistence surface for the signed-in user's tokens and profile.
 *
 * The ViewModel layer only depends on this interface; production uses
 * [DataStoreAuthSession], tests use [InMemoryAuthSession]. Mirrors the
 * Web's HttpOnly cookie pair — but Android holds the tokens on-device
 * via DataStore Preferences (encrypted backups are out of scope; see
 * ADR 0010 §Negative consequences).
 */
interface AuthSession {

    /** Latest stored session, or `null` when signed out. Hot stream. */
    fun sessionFlow(): Flow<StoredSession?>

    suspend fun save(payload: AuthSessionPayload)

    suspend fun clear()
}

/**
 * On-disk shape. Persisted as a single JSON string under one key so the
 * "save / clear" semantics stay atomic with respect to readers.
 */
@Serializable
data class StoredSession(
    val accessToken: String,
    val refreshToken: String,
    val user: StoredAuthUser,
)

@Serializable
data class StoredAuthUser(
    val id: String,
    val email: String,
    val displayName: String? = null,
    val createdAt: String? = null,
    val level: String? = null,
)

fun AuthSessionPayload.toStored(): StoredSession = StoredSession(
    accessToken = accessToken,
    refreshToken = refreshToken,
    user = StoredAuthUser(
        id = user.id,
        email = user.email,
        displayName = user.displayName,
        createdAt = user.createdAt,
        level = user.level,
    ),
)

fun StoredSession.toAuthUser(): AuthUser = AuthUser(
    id = user.id,
    email = user.email,
    displayName = user.displayName,
    createdAt = user.createdAt,
    level = user.level,
)
