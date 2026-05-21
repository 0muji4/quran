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

    fun bestScoreForSurah(surahId: String): Flow<Double?>

    suspend fun recordBestScore(
        surahId: String,
        ayahNumber: Int,
        score: Double,
        achievedAt: Instant = Instant.now(),
    )

    fun recentAttempts(limit: Int = HistoryStoreConstants.HISTORY_LIMIT): Flow<List<Attempt>>

    suspend fun recordAttempt(attempt: Attempt)

    /**
     * Drop every locally cached entry — last-practiced, best-scores,
     * attempts. Called on sign-out (so the next sign-in starts clean)
     * and by `RemoteSyncedHistoryStore.refreshFromRemote()` before
     * replaying server state.
     */
    suspend fun clear()
}

/** Composite key matching the web `${surahId}:${ayahNumber}` convention. */
internal fun bestScoreKey(surahId: String, ayahNumber: Int): String = "$surahId:$ayahNumber"
