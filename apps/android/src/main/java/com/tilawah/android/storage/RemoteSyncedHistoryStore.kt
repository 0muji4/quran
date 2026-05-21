package com.tilawah.android.storage

import com.tilawah.android.app.AppError
import com.tilawah.android.backend.HistoryRemoteClient
import com.tilawah.android.telemetry.Telemetry
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch
import java.time.Instant

/**
 * [HistoryStore] decorator that mirrors local writes through to the
 * BFF `/me` endpoints and rebuilds the local cache from the server on
 * demand. Reads return from the local cache (the [Flow]s of the wrapped
 * store) so the UI is instant; writes update the cache synchronously
 * and fire a [HistoryRemoteClient] call in the background.
 *
 * Layered under [SignInGatedHistoryStore] (landed in PR9), so anonymous
 * calls never reach this class. [refreshFromRemote] is the bulk-pull
 * called by `AppRoot` on sign-in to seed the cache from the server
 * before any view consumes it; per-call throttling can layer on later
 * if reads-from-stale-cache become a problem.
 *
 * BFF write failures are logged through [Telemetry]. The cache write
 * has already succeeded by the time we know — the call is
 * fire-and-forget — so we don't surface anything to the user, but the
 * failure is no longer invisible. Dashboards can group by
 * `AppError.telemetryCode` to spot a sustained desync between the
 * device cache and the server-of-record.
 *
 * Mirrors `apps/ios/Sources/QuranRecitationApp/Storage/RemoteSyncedHistoryStore.swift`.
 */
class RemoteSyncedHistoryStore(
    private val cache: HistoryStore,
    private val remote: HistoryRemoteClient,
    private val telemetry: Telemetry,
    private val scope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO),
) : HistoryStore {

    // MARK: - Reads (pass-through)

    override fun lastPracticed(): Flow<LastPracticed?> = cache.lastPracticed()

    override fun bestScore(surahId: String, ayahNumber: Int): Flow<BestScoreEntry?> =
        cache.bestScore(surahId, ayahNumber)

    override fun bestScoreForSurah(surahId: String): Flow<Double?> =
        cache.bestScoreForSurah(surahId)

    override fun recentAttempts(limit: Int): Flow<List<Attempt>> = cache.recentAttempts(limit)

    // MARK: - Writes (cache then fire-and-forget remote)

    override suspend fun setLastPracticed(entry: LastPracticed) {
        cache.setLastPracticed(entry)
        scheduleRemote(operation = "me.last-practiced.put") {
            remote.putLastPracticed(entry)
        }
    }

    override suspend fun recordBestScore(
        surahId: String,
        ayahNumber: Int,
        score: Double,
        achievedAt: Instant,
    ) {
        cache.recordBestScore(surahId, ayahNumber, score, achievedAt)
        val entry = BestScoreEntry(score, achievedAt)
        scheduleRemote(
            operation = "me.best-scores.put",
            context = mapOf(
                "surah_id" to surahId,
                "ayah_number" to ayahNumber.toString(),
            ),
        ) {
            remote.putBestScore(surahId, ayahNumber, entry)
        }
    }

    override suspend fun recordAttempt(attempt: Attempt) {
        cache.recordAttempt(attempt)
        scheduleRemote(
            operation = "me.attempts.post",
            context = mapOf(
                "surah_id" to attempt.surahId,
                "ayah_number" to attempt.ayahNumber.toString(),
                "attempt_id" to attempt.id,
            ),
        ) {
            remote.recordAttempt(attempt)
        }
    }

    override suspend fun clear() {
        cache.clear()
    }

    // MARK: - Remote refresh

    /**
     * Pull every record from the BFF concurrently and rebuild the local
     * cache. The previous cache is wiped first so a sign-in against a
     * different account does not leave stragglers from the previous
     * identity.
     *
     * Failures are reported through telemetry but otherwise swallowed:
     * a transient network blip leaves the cache as-is, and the next
     * per-write fire-and-forget converges.
     */
    override suspend fun refreshFromRemote() {
        try {
            val (last, scores, attempts) = coroutineScope {
                val lastDef = async { remote.lastPracticed() }
                val scoresDef = async { remote.bestScores() }
                val attemptsDef =
                    async { remote.attempts(limit = HistoryStoreConstants.HISTORY_LIMIT) }
                Triple(lastDef.await(), scoresDef.await(), attemptsDef.await())
            }

            cache.clear()
            last?.let { cache.setLastPracticed(it) }
            for ((key, entry) in scores) {
                val (surahId, ayahNumber) = parseBestScoreKey(key) ?: continue
                cache.recordBestScore(surahId, ayahNumber, entry.score, entry.achievedAt)
            }
            // BFF returns attempts newest-first; cache.recordAttempt prepends,
            // so replaying oldest-first preserves the server ordering.
            for (attempt in attempts.asReversed()) {
                cache.recordAttempt(attempt)
            }
        } catch (cause: AppError) {
            telemetry.error(cause, context = mapOf("operation" to "history.refresh"))
        } catch (cause: Throwable) {
            telemetry.error(
                AppError.BackendUnavailable("me.refresh", cause),
                context = mapOf(
                    "operation" to "history.refresh",
                    "raw_error" to (cause.message ?: cause.javaClass.simpleName),
                ),
            )
        }
    }

    /**
     * Joins every in-flight remote write spawned by this store. Test
     * helper — production callers don't need to drain since the writes
     * are fire-and-forget by design.
     */
    suspend fun awaitPendingWrites() {
        scope.coroutineContext[Job]?.children?.toList()?.forEach { it.join() }
    }

    // MARK: - Helpers

    private fun scheduleRemote(
        operation: String,
        context: Map<String, String> = emptyMap(),
        block: suspend () -> Unit,
    ) {
        scope.launch {
            try {
                block()
            } catch (cause: AppError) {
                telemetry.error(
                    cause,
                    context = context + ("operation" to operation),
                )
            } catch (cause: Throwable) {
                telemetry.error(
                    AppError.BackendUnavailable(operation, cause),
                    context = context + (
                        "operation" to operation
                    ) + (
                        "raw_error" to (cause.message ?: cause.javaClass.simpleName)
                    ),
                )
            }
        }
    }

    /**
     * Best-score map keys are `"<surahId>:<ayahNumber>"`. A malformed
     * key from the server is silently skipped rather than crashing the
     * whole refresh — one bad entry should not strand the rest.
     */
    private fun parseBestScoreKey(key: String): Pair<String, Int>? {
        val parts = key.split(":", limit = 2)
        if (parts.size != 2) return null
        val surahId = parts[0].takeIf { it.isNotEmpty() } ?: return null
        val ayahNumber = parts[1].toIntOrNull()?.takeIf { it >= 1 } ?: return null
        return surahId to ayahNumber
    }
}
