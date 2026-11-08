package com.tilawah.android.storage

import kotlinx.coroutines.flow.Flow
import java.time.Instant

/**
 * Persistence surface for practice history. The View / ViewModel layer
 * only depends on this interface; production uses
 * [DataStoreHistoryStore], tests use [InMemoryHistoryStore]. A future
 * `RemoteHistoryStore` implementation would be a drop-in swap when the
 * BFF grows a `history` query.
 *
 * The async (`Flow` / `suspend`) shape is the deliberate Android
 * divergence from iOS's sync `UserDefaults` API; it composes naturally
 * with Compose `collectAsStateWithLifecycle` and DataStore's underlying
 * async storage. See ADR 0007.
 */
interface HistoryStore {

    fun lastPracticed(): Flow<LastPracticed?>

    suspend fun setLastPracticed(entry: LastPracticed)

    fun bestScore(surahId: String, ayahNumber: Int): Flow<BestScoreEntry?>

    /** Highest best score per surah, keyed by surah id. */
    fun bestScoresBySurah(): Flow<Map<String, Int>>

    suspend fun recordBestScore(
        surahId: String,
        ayahNumber: Int,
        score: Int,
        achievedAt: Instant = Instant.now(),
    )

    fun recentAttempts(limit: Int = HistoryStoreConstants.HISTORY_LIMIT): Flow<List<Attempt>>

    suspend fun recordAttempt(attempt: Attempt)

    /**
     * Drop every locally cached entry — last-practiced, best-scores,
     * attempts. Called on sign-out so the next sign-in starts clean.
     */
    suspend fun clear()

    /**
     * Pull the entire history from the BFF and rebuild the local cache.
     * Default is a no-op — only `RemoteSyncedHistoryStore` actually
     * talks to the BFF; the plain in-memory / DataStore implementations
     * have no remote to refresh from. Kept on the interface so the
     * `SignInGatedHistoryStore` decorator can delegate without knowing
     * which concrete store sits underneath.
     */
    suspend fun refreshFromRemote() = Unit
}

/** The whole history that a refresh writes into the cache. */
data class HistorySnapshot(
    val lastPracticed: LastPracticed?,
    /** Keyed by [bestScoreKey]. */
    val bestScores: Map<String, BestScoreEntry>,
    /** Newest first. */
    val attempts: List<Attempt>,
)

/** A local [HistoryStore] whose whole content can be replaced at once. */
interface HistoryCache : HistoryStore {
    /** Readers see either the previous content or [snapshot], never an empty or partly written cache. */
    suspend fun replaceAll(snapshot: HistorySnapshot)
}

/** Composite key matching the web `${surahId}:${ayahNumber}` convention. */
internal fun bestScoreKey(surahId: String, ayahNumber: Int): String = "$surahId:$ayahNumber"

internal fun Map<String, BestScoreEntry>.maxBySurah(): Map<String, Int> =
    entries
        .groupBy { (key, _) -> key.substringBefore(':') }
        .mapValues { (_, perAyah) -> perAyah.maxOf { it.value.score } }
