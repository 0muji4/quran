package com.tilawah.android.storage

import com.tilawah.android.app.AppError
import com.tilawah.android.backend.HistoryRemoteClient
import com.tilawah.android.telemetry.Telemetry
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.time.Instant

@OptIn(ExperimentalCoroutinesApi::class)
class RemoteSyncedHistoryStoreTest {

    private val dispatcher = UnconfinedTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun lastPracticed(surahId: String = "1", ayah: Int = 1) = LastPracticed(
        surahId = surahId,
        ayahNumber = ayah,
        surahNameEn = "Al-Fatihah",
        surahNameAr = "الفاتحة",
        ayahCount = 7,
        practicedAt = Instant.parse("2026-01-04T12:00:00Z"),
    )

    private fun attempt(id: String = "a1", surahId: String = "1", ayah: Int = 1) = Attempt(
        id = id,
        surahId = surahId,
        surahNameEn = "Al-Fatihah",
        ayahNumber = ayah,
        score = 92.0,
        jobId = "j-$id",
        createdAt = Instant.parse("2026-01-04T12:00:00Z"),
        status = AttemptStatus.COMPLETED,
    )

    private fun build(
        cache: HistoryStore = InMemoryHistoryStore(),
        remote: HistoryRemoteClient = FakeRemote(),
        telemetry: SpyTelemetry = SpyTelemetry(),
    ): Triple<RemoteSyncedHistoryStore, HistoryStore, SpyTelemetry> {
        val scope = CoroutineScope(SupervisorJob() + dispatcher)
        val store = RemoteSyncedHistoryStore(cache, remote, telemetry, scope)
        return Triple(store, cache, telemetry)
    }

    @Test
    fun `setLastPracticed writes through to cache and remote`() = runTest {
        val remote = FakeRemote()
        val (store, cache, _) = build(remote = remote)

        store.setLastPracticed(lastPracticed())
        store.awaitPendingWrites()

        assertEquals(lastPracticed(), cache.lastPracticed().first())
        assertEquals(listOf(lastPracticed()), remote.lastPracticedPuts)
    }

    @Test
    fun `recordBestScore writes through to cache and remote`() = runTest {
        val remote = FakeRemote()
        val (store, cache, _) = build(remote = remote)

        store.recordBestScore("2", 255, 92.0, Instant.parse("2026-01-04T12:00:00Z"))
        store.awaitPendingWrites()

        assertEquals(92.0, cache.bestScore("2", 255).first()?.score!!, 0.0001)
        assertEquals(1, remote.bestScorePuts.size)
        assertEquals("2:255", remote.bestScorePuts[0].first)
        assertEquals(92.0, remote.bestScorePuts[0].second.score, 0.0001)
    }

    @Test
    fun `recordAttempt writes through to cache and remote`() = runTest {
        val remote = FakeRemote()
        val (store, cache, _) = build(remote = remote)

        store.recordAttempt(attempt(id = "a1"))
        store.awaitPendingWrites()

        assertEquals(1, cache.recentAttempts().first().size)
        assertEquals(listOf("a1"), remote.attemptPosts.map { it.id })
    }

    @Test
    fun `cache write succeeds even when remote throws`() = runTest {
        val remote = FakeRemote(
            putLastPracticedResult = { throw AppError.Network(IllegalStateException("offline")) },
        )
        val telemetry = SpyTelemetry()
        val (store, cache, _) = build(remote = remote, telemetry = telemetry)

        store.setLastPracticed(lastPracticed())
        store.awaitPendingWrites()

        // Cache write went through despite the remote failure.
        assertEquals(lastPracticed(), cache.lastPracticed().first())
        assertEquals(1, telemetry.errors.size)
        assertEquals("network", telemetry.errors[0].first.telemetryCode)
        assertEquals("me.last-practiced.put", telemetry.errors[0].second["operation"])
    }

    @Test
    fun `refreshFromRemote wipes and rebuilds the cache`() = runTest {
        val cache = InMemoryHistoryStore()
        // Stale data from a previous identity that must be wiped.
        cache.setLastPracticed(lastPracticed(surahId = "stale"))
        cache.recordAttempt(attempt(id = "stale-1"))

        val remote = FakeRemote(
            lastPracticedResult = { lastPracticed(surahId = "fresh", ayah = 5) },
            bestScoresResult = {
                mapOf(
                    "fresh:1" to BestScoreEntry(99.0, Instant.parse("2026-01-04T12:00:00Z")),
                    "malformed-key" to BestScoreEntry(50.0, Instant.parse("2026-01-04T12:00:00Z")),
                )
            },
            attemptsResult = { listOf(attempt(id = "fresh-2"), attempt(id = "fresh-1")) },
        )
        val (store, _, _) = build(cache = cache, remote = remote)

        store.refreshFromRemote()
        advanceUntilIdle()

        // Last practiced replaced with the server view.
        assertEquals("fresh", cache.lastPracticed().first()?.surahId)
        // Best score loaded; malformed key silently skipped.
        assertEquals(99.0, cache.bestScore("fresh", 1).first()?.score!!, 0.0001)
        // Newest-first server order preserved after the oldest-first replay.
        val attempts = cache.recentAttempts().first()
        assertEquals(listOf("fresh-2", "fresh-1"), attempts.map { it.id })
    }

    @Test
    fun `refreshFromRemote telemeters a transient failure and leaves the cache as-is`() = runTest {
        val cache = InMemoryHistoryStore()
        cache.setLastPracticed(lastPracticed(surahId = "kept", ayah = 7))
        val remote = FakeRemote(
            lastPracticedResult = { throw AppError.Network(IllegalStateException("offline")) },
        )
        val telemetry = SpyTelemetry()
        val (store, _, _) = build(cache = cache, remote = remote, telemetry = telemetry)

        store.refreshFromRemote()

        assertEquals("kept", cache.lastPracticed().first()?.surahId)
        assertTrue(telemetry.errors.any { it.second["operation"] == "history.refresh" })
    }

    @Test
    fun `clear delegates to the cache without firing remote calls`() = runTest {
        val remote = FakeRemote()
        val cache = InMemoryHistoryStore()
        cache.setLastPracticed(lastPracticed())
        cache.recordAttempt(attempt())
        val (store, _, _) = build(cache = cache, remote = remote)

        store.clear()
        store.awaitPendingWrites()

        assertNull(cache.lastPracticed().first())
        assertTrue(cache.recentAttempts().first().isEmpty())
        assertTrue(remote.attemptPosts.isEmpty())
        assertTrue(remote.lastPracticedPuts.isEmpty())
    }

    private class FakeRemote(
        var lastPracticedResult: suspend () -> LastPracticed? = { null },
        var putLastPracticedResult: suspend (LastPracticed) -> LastPracticed = { it },
        var bestScoresResult: suspend () -> Map<String, BestScoreEntry> = { emptyMap() },
        var putBestScoreResult: suspend (String, Int, BestScoreEntry) -> BestScoreEntry =
            { _, _, e -> e },
        var attemptsResult: suspend (Int) -> List<Attempt> = { emptyList() },
        var recordAttemptResult: suspend (Attempt) -> Attempt = { it },
    ) : HistoryRemoteClient {
        val lastPracticedPuts = mutableListOf<LastPracticed>()
        val bestScorePuts = mutableListOf<Pair<String, BestScoreEntry>>()
        val attemptPosts = mutableListOf<Attempt>()

        override suspend fun lastPracticed(): LastPracticed? = lastPracticedResult()
        override suspend fun putLastPracticed(entry: LastPracticed): LastPracticed {
            lastPracticedPuts += entry
            return putLastPracticedResult(entry)
        }

        override suspend fun bestScores(): Map<String, BestScoreEntry> = bestScoresResult()
        override suspend fun putBestScore(
            surahId: String,
            ayahNumber: Int,
            entry: BestScoreEntry,
        ): BestScoreEntry {
            bestScorePuts += ("$surahId:$ayahNumber" to entry)
            return putBestScoreResult(surahId, ayahNumber, entry)
        }

        override suspend fun attempts(limit: Int): List<Attempt> = attemptsResult(limit)
        override suspend fun recordAttempt(attempt: Attempt): Attempt {
            attemptPosts += attempt
            return recordAttemptResult(attempt)
        }
    }

    private class SpyTelemetry : Telemetry {
        val errors = mutableListOf<Pair<AppError, Map<String, String>>>()
        override fun event(name: String, attributes: Map<String, String>) {}
        override suspend fun <T> measure(name: String, block: suspend () -> T): T = block()
        override fun error(error: AppError, context: Map<String, String>) {
            errors += (error to context)
        }
    }
}
