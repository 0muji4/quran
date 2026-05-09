package tv.every.tilawah.android.storage

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
class InMemoryHistoryStore : HistoryStore {

    private val _last = MutableStateFlow<LastPracticed?>(null)
    private val _best = MutableStateFlow<Map<String, BestScoreEntry>>(emptyMap())
    private val _attempts = MutableStateFlow<List<Attempt>>(emptyList())

    override fun lastPracticed(): Flow<LastPracticed?> = _last.asStateFlow()

    override suspend fun setLastPracticed(entry: LastPracticed) {
        _last.value = entry
    }

    override fun bestScore(surahId: String, ayahNumber: Int): Flow<BestScoreEntry?> =
        _best.map { it[bestScoreKey(surahId, ayahNumber)] }

    override fun bestScoreForSurah(surahId: String): Flow<Double?> =
        _best.map { all ->
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
}
