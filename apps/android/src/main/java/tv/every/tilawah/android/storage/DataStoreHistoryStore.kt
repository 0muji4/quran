package tv.every.tilawah.android.storage

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import kotlinx.serialization.SerializationException
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import tv.every.tilawah.android.app.AppError
import java.io.IOException
import java.time.Instant

/**
 * Production [HistoryStore] backed by Jetpack DataStore Preferences.
 *
 * Each top-level entry serialises to a single JSON string under the
 * stable web key (`tilawah:last-practiced`, `tilawah:best-scores`,
 * `tilawah:recent-attempts`) so the JSON shape stays byte-compatible
 * with `apps/web/app/lib/storage.ts` and the iOS
 * `UserDefaultsHistoryStore`. See ADR 0007.
 *
 * IO failures throw [AppError.StorageUnavailable] from suspend writes;
 * read flows recover from [IOException] by emitting an empty value so
 * the UI does not jam on a transient disk error.
 */
class DataStoreHistoryStore(
    private val dataStore: DataStore<Preferences>,
    private val json: Json = HistoryJson,
) : HistoryStore {

    private val lastKey = stringPreferencesKey(HistoryStoreConstants.Key.LAST_PRACTICED)
    private val bestKey = stringPreferencesKey(HistoryStoreConstants.Key.BEST_SCORES)
    private val attemptsKey = stringPreferencesKey(HistoryStoreConstants.Key.RECENT_ATTEMPTS)

    override fun lastPracticed(): Flow<LastPracticed?> = readPref(lastKey)
        .map { raw -> raw?.let { decodeOrNull<LastPracticed>(it) } }

    override suspend fun setLastPracticed(entry: LastPracticed) {
        write { prefs -> prefs[lastKey] = json.encodeToString(entry) }
    }

    override fun bestScore(surahId: String, ayahNumber: Int): Flow<BestScoreEntry?> =
        bestScoresFlow().map { it[bestScoreKey(surahId, ayahNumber)] }

    override fun bestScoreForSurah(surahId: String): Flow<Double?> =
        bestScoresFlow().map { all ->
            val prefix = "$surahId:"
            all.entries
                .filter { it.key.startsWith(prefix) }
                .maxOfOrNull { it.value.score }
        }

    override suspend fun recordBestScore(
        surahId: String,
        ayahNumber: Int,
        score: Double,
        achievedAt: Instant,
    ) {
        write { prefs ->
            val all = prefs[bestKey]?.let { decodeOrNull<Map<String, BestScoreEntry>>(it) } ?: emptyMap()
            val k = bestScoreKey(surahId, ayahNumber)
            val existing = all[k]
            if (existing == null || score > existing.score) {
                val next = all + (k to BestScoreEntry(score, achievedAt))
                prefs[bestKey] = json.encodeToString<Map<String, BestScoreEntry>>(next)
            }
        }
    }

    override fun recentAttempts(limit: Int): Flow<List<Attempt>> = readPref(attemptsKey)
        .map { raw ->
            raw?.let { decodeOrNull<AttemptLog>(it)?.attempts.orEmpty() }
                ?.take(limit)
                .orEmpty()
        }

    override suspend fun recordAttempt(attempt: Attempt) {
        write { prefs ->
            val existing = prefs[attemptsKey]?.let { decodeOrNull<AttemptLog>(it)?.attempts }.orEmpty()
            val next = (listOf(attempt) + existing).take(HistoryStoreConstants.HISTORY_LIMIT)
            prefs[attemptsKey] = json.encodeToString(AttemptLog(next))
        }
    }

    private fun bestScoresFlow(): Flow<Map<String, BestScoreEntry>> = readPref(bestKey)
        .map { raw -> raw?.let { decodeOrNull<Map<String, BestScoreEntry>>(it) } ?: emptyMap() }

    private fun readPref(key: Preferences.Key<String>): Flow<String?> = dataStore.data
        .catch { cause ->
            if (cause is IOException) emit(emptyPreferences()) else throw cause
        }
        .map { it[key] }

    private suspend fun write(block: (androidx.datastore.preferences.core.MutablePreferences) -> Unit) {
        try {
            dataStore.edit(block)
        } catch (cause: IOException) {
            throw AppError.StorageUnavailable
        }
    }

    private inline fun <reified T> decodeOrNull(raw: String): T? = try {
        json.decodeFromString<T>(raw)
    } catch (_: SerializationException) {
        null
    }

    private fun emptyPreferences(): Preferences =
        androidx.datastore.preferences.core.emptyPreferences()
}

/** Shared Json instance configured to match the web JSON.stringify shape. */
val HistoryJson: Json = Json {
    ignoreUnknownKeys = true
    encodeDefaults = false
    explicitNulls = false
}
