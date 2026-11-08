package com.tilawah.android.storage

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import java.time.Instant

/**
 * In-process [HistoryStore] for unit tests and Compose previews.
 * Mirrors the production [DataStoreHistoryStore] semantics (50-attempt
 * cap, best-of replacement).
 */
class InMemoryHistoryStore : HistoryCache {

    private val _last = MutableStateFlow<LastPracticed?>(null)
    private val _best = MutableStateFlow<Map<String, BestScoreEntry>>(emptyMap())
    private val _attempts = MutableStateFlow<List<Attempt>>(emptyList())

    override fun lastPracticed(): Flow<LastPracticed?> = _last.asStateFlow()

    override suspend fun setLastPracticed(entry: LastPracticed) {
        _last.value = entry
    }

    override fun bestScore(surahId: String, ayahNumber: Int): Flow<BestScoreEntry?> =
        _best.map { it[bestScoreKey(surahId, ayahNumber)] }

    override fun bestScoresBySurah(): Flow<Map<String, Int>> =
        _best.map { it.maxBySurah() }

    override suspend fun recordBestScore(
        surahId: String,
        ayahNumber: Int,
        score: Int,
        achievedAt: Instant,
    ) {
        val key = bestScoreKey(surahId, ayahNumber)
        val existing = _best.value[key]
        if (existing == null || score > existing.score) {
            _best.value = _best.value + (key to BestScoreEntry(score, achievedAt))
        }
    }

    override fun recentAttempts(limit: Int): Flow<List<Attempt>> =
        _attempts.map { it.take(limit) }

    override suspend fun recordAttempt(attempt: Attempt) {
        _attempts.value = (listOf(attempt) + _attempts.value)
            .take(HistoryStoreConstants.HISTORY_LIMIT)
    }

    override suspend fun replaceAll(snapshot: HistorySnapshot) {
        _last.value = snapshot.lastPracticed
        _best.value = snapshot.bestScores
        _attempts.value = snapshot.attempts.take(HistoryStoreConstants.HISTORY_LIMIT)
    }

    override suspend fun clear() {
        _last.value = null
        _best.value = emptyMap()
        _attempts.value = emptyList()
    }
}
