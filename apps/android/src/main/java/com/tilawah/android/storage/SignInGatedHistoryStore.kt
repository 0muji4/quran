package com.tilawah.android.storage

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import java.time.Instant

/**
 * Decorator that gates every [HistoryStore] operation by the signed-in
 * state of the current session. Reads emit nil / empty for anonymous
 * users, writes are silently dropped, and [clear] always delegates so
 * callers can wipe the cache irrespective of session state (used on
 * sign-out — see `AppRoot`).
 *
 * Why a decorator rather than inline gates at each ViewModel call
 * site: a new write path could be added later and forget the
 * `isSignedIn` check; centralising the gate at the storage seam
 * prevents that drift. ADR 0021 §"Decision (1)" defines the
 * invariant the gate enforces.
 *
 * [isSignedIn] is a `() -> Boolean` lambda rather than an
 * `AuthSession` reference so the gate keeps no opinion on how
 * signed-in state is observed — tests pass `{ false }` / `{ true }`
 * directly, and production captures the current snapshot of an
 * `AuthSession`-backed `StateFlow`.
 *
 * Mirrors `apps/ios/Sources/QuranRecitationApp/Storage/SignInGatedHistoryStore.swift`.
 */
class SignInGatedHistoryStore(
    private val base: HistoryStore,
    private val isSignedIn: () -> Boolean,
) : HistoryStore {

    override fun lastPracticed(): Flow<LastPracticed?> =
        if (isSignedIn()) base.lastPracticed() else flowOf(null)

    override suspend fun setLastPracticed(entry: LastPracticed) {
        if (!isSignedIn()) return
        base.setLastPracticed(entry)
    }

    override fun bestScore(surahId: String, ayahNumber: Int): Flow<BestScoreEntry?> =
        if (isSignedIn()) base.bestScore(surahId, ayahNumber) else flowOf(null)

    override fun bestScoreForSurah(surahId: String): Flow<Double?> =
        if (isSignedIn()) base.bestScoreForSurah(surahId) else flowOf(null)

    override suspend fun recordBestScore(
        surahId: String,
        ayahNumber: Int,
        score: Double,
        achievedAt: Instant,
    ) {
        if (!isSignedIn()) return
        base.recordBestScore(surahId, ayahNumber, score, achievedAt)
    }

    override fun recentAttempts(limit: Int): Flow<List<Attempt>> =
        if (isSignedIn()) base.recentAttempts(limit) else flowOf(emptyList())

    override suspend fun recordAttempt(attempt: Attempt) {
        if (!isSignedIn()) return
        base.recordAttempt(attempt)
    }

    /**
     * Always delegates — callers (sign-out) need to wipe the cache
     * regardless of the current session state, otherwise a race where
     * `isSignedIn` flips before [clear] lands would strand the
     * previous user's records.
     */
    override suspend fun clear() {
        base.clear()
    }

    /**
     * Delegates without gating. AppRoot calls this exactly when the
     * gate is about to flip to signed-in, so a guard here would race
     * the bridge that flips it.
     */
    override suspend fun refreshFromRemote() {
        base.refreshFromRemote()
    }
}
