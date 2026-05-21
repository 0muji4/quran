package com.tilawah.android.storage

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.core.stringPreferencesKey
import com.tilawah.android.app.AppError
import com.tilawah.android.backend.AuthSessionPayload
import com.tilawah.android.backend.AuthUser
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import java.io.IOException

/**
 * Production [AuthSession] backed by Jetpack DataStore Preferences.
 * Follows the same pattern as [DataStoreHistoryStore]: a single key,
 * JSON-encoded value, and `IOException` recovery on the read flow.
 *
 * Writes raise [AppError.StorageUnavailable] on `IOException` so
 * ViewModel sign-in / sign-out handlers can surface a recoverable
 * error rather than crashing the activity.
 */
class DataStoreAuthSession(
    private val dataStore: DataStore<Preferences>,
    private val json: Json = AuthSessionJson,
) : AuthSession {

    private val sessionKey = stringPreferencesKey(SESSION_KEY)

    override fun sessionFlow(): Flow<StoredSession?> = dataStore.data
        .catch { cause ->
            if (cause is IOException) emit(emptyPreferences()) else throw cause
        }
        .map { prefs ->
            prefs[sessionKey]?.let { raw ->
                try {
                    json.decodeFromString(StoredSession.serializer(), raw)
                } catch (_: SerializationException) {
                    null
                }
            }
        }

    override suspend fun save(payload: AuthSessionPayload) {
        try {
            dataStore.edit { prefs ->
                prefs[sessionKey] = json.encodeToString(
                    StoredSession.serializer(),
                    payload.toStored(),
                )
            }
        } catch (_: IOException) {
            throw AppError.StorageUnavailable
        }
    }

    override suspend fun updateUser(user: AuthUser) {
        try {
            dataStore.edit { prefs ->
                val raw = prefs[sessionKey] ?: return@edit
                val current = try {
                    json.decodeFromString(StoredSession.serializer(), raw)
                } catch (_: SerializationException) {
                    return@edit
                }
                val updated = current.copy(
                    user = StoredAuthUser(
                        id = user.id,
                        email = user.email,
                        displayName = user.displayName,
                        createdAt = user.createdAt,
                        level = user.level,
                    ),
                )
                prefs[sessionKey] = json.encodeToString(StoredSession.serializer(), updated)
            }
        } catch (_: IOException) {
            throw AppError.StorageUnavailable
        }
    }

    override suspend fun clear() {
        try {
            dataStore.edit { prefs -> prefs.remove(sessionKey) }
        } catch (_: IOException) {
            throw AppError.StorageUnavailable
        }
    }

    private companion object {
        const val SESSION_KEY = "tilawah:auth-session"
    }
}

internal val AuthSessionJson: Json = Json {
    ignoreUnknownKeys = true
    encodeDefaults = false
    explicitNulls = false
}
