package com.tilawah.android.storage

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.flatMapLatest
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
 * signed-in check; centralising the gate at the storage seam
 * prevents that drift. ADR 0021 §"Decision (1)" defines the
 * invariant the gate enforces.
 *
 * Reads follow [signedIn], so a flow collected before sign-in starts
 * emitting the cache once the user signs in. Writes check its current value.
 *
 * Mirrors `apps/ios/Sources/QuranRecitationApp/Storage/SignInGatedHistoryStore.swift`.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class SignInGatedHistoryStore(
    private val base: HistoryStore,
    private val signedIn: StateFlow<Boolean>,
) : HistoryStore {

    override fun lastPracticed(): Flow<LastPracticed?> =
        whenSignedIn(signedOut = null) { base.lastPracticed() }

    override suspend fun setLastPracticed(entry: LastPracticed) {
        if (!signedIn.value) return
        base.setLastPracticed(entry)
    }

    override fun bestScore(surahId: String, ayahNumber: Int): Flow<BestScoreEntry?> =
        whenSignedIn(signedOut = null) { base.bestScore(surahId, ayahNumber) }

    override fun bestScoresBySurah(): Flow<Map<String, Int>> =
        whenSignedIn(signedOut = emptyMap()) { base.bestScoresBySurah() }

    override suspend fun recordBestScore(
        surahId: String,
        ayahNumber: Int,
        score: Int,
        achievedAt: Instant,
    ) {
        if (!signedIn.value) return
        base.recordBestScore(surahId, ayahNumber, score, achievedAt)
    }

    override fun recentAttempts(limit: Int): Flow<List<Attempt>> =
        whenSignedIn(signedOut = emptyList()) { base.recentAttempts(limit) }

    override suspend fun recordAttempt(attempt: Attempt) {
        if (!signedIn.value) return
        base.recordAttempt(attempt)
    }

    /**
     * Always delegates — callers (sign-out) need to wipe the cache
     * regardless of the current session state, otherwise a race where
     * [signedIn] flips before [clear] lands would strand the
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

    private fun <T> whenSignedIn(signedOut: T, read: () -> Flow<T>): Flow<T> =
        signedIn.flatMapLatest { if (it) read() else flowOf(signedOut) }
}
