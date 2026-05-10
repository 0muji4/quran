package com.tilawah.android.storage

import app.cash.turbine.test
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

class HistoryStoreTest {

    /** Asserts every Attempt field name + JSON value matches the web fixture. */
    @Test
    fun `Attempt JSON shape matches web fixture byte-for-byte`() {
        val fixtureRaw = readFixture()
        val parsed: JsonObject = Json.parseToJsonElement(fixtureRaw).let { it as JsonObject }
        val webAttempt = Json { explicitNulls = false }.encodeToString(parsed["attempt"]!!)

        val attempt = Attempt(
            id = "att-1",
            surahId = "1",
            surahNameEn = "Al-Fatihah",
            ayahNumber = 2,
            score = 0.84,
            jobId = "job-abc",
            createdAt = Instant.parse("2026-05-09T12:30:00Z"),
            status = AttemptStatus.COMPLETED,
            durationMs = 5400,
        )
        val rendered = HistoryJson.encodeToString(attempt)
        // Re-parse both via JsonElement so ordering / whitespace is normalised.
        assertEquals(
            Json.parseToJsonElement(webAttempt),
            Json.parseToJsonElement(rendered),
        )
    }

    @Test
    fun `LastPracticed JSON shape matches web fixture`() {
        val fixtureRaw = readFixture()
        val parsed = Json.parseToJsonElement(fixtureRaw) as JsonObject
        val webLast = parsed["lastPracticed"]!!
        val last = LastPracticed(
            surahId = "1",
            ayahNumber = 2,
            surahNameEn = "Al-Fatihah",
            surahNameAr = "الفاتحة",
            ayahCount = 7,
            practicedAt = Instant.parse("2026-05-09T12:30:00Z"),
        )
        val rendered = HistoryJson.encodeToString(last)
        assertEquals(webLast, Json.parseToJsonElement(rendered))
    }

    @Test
    fun `InMemoryHistoryStore round-trips lastPracticed`() = runTest {
        val store = InMemoryHistoryStore()
        assertNull(store.lastPracticed().first())
        val entry = LastPracticed(
            surahId = "2",
            ayahNumber = 3,
            surahNameEn = "Al-Baqarah",
            surahNameAr = "البقرة",
            ayahCount = 286,
            practicedAt = Instant.parse("2026-05-09T13:00:00Z"),
        )
        store.setLastPracticed(entry)
        assertEquals(entry, store.lastPracticed().first())
    }

    @Test
    fun `recordBestScore replaces only when score increases`() = runTest {
        val store = InMemoryHistoryStore()
        val t = Instant.parse("2026-05-09T13:00:00Z")
        store.recordBestScore("1", 1, 0.5, t)
        store.recordBestScore("1", 1, 0.4, t.plusSeconds(60))
        store.recordBestScore("1", 1, 0.7, t.plusSeconds(120))
        val entry = store.bestScore("1", 1).first()
        assertEquals(0.7, entry?.score)
        assertEquals(t.plusSeconds(120), entry?.achievedAt)
    }

    @Test
    fun `bestScoreForSurah returns max across ayahs`() = runTest {
        val store = InMemoryHistoryStore()
        val t = Instant.parse("2026-05-09T13:00:00Z")
        store.recordBestScore("1", 1, 0.6, t)
        store.recordBestScore("1", 2, 0.8, t)
        store.recordBestScore("2", 1, 0.95, t)
        assertEquals(0.8, store.bestScoreForSurah("1").first())
        assertEquals(0.95, store.bestScoreForSurah("2").first())
        assertNull(store.bestScoreForSurah("missing").first())
    }

    @Test
    fun `recordAttempt enforces 50-cap and prepends newest`() = runTest {
        val store = InMemoryHistoryStore()
        val t0 = Instant.parse("2026-05-09T13:00:00Z")
        repeat(60) { i ->
            store.recordAttempt(
                Attempt(
                    id = "att-$i",
                    surahId = "1",
                    surahNameEn = "Al-Fatihah",
                    ayahNumber = (i % 7) + 1,
                    score = 0.5,
                    jobId = "job-$i",
                    createdAt = t0.plusSeconds(i.toLong()),
                    status = AttemptStatus.COMPLETED,
                ),
            )
        }
        store.recentAttempts().test {
            val attempts = awaitItem()
            assertEquals(50, attempts.size)
            assertEquals("att-59", attempts.first().id)
            assertEquals("att-10", attempts.last().id)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `recentAttempts respects custom limit`() = runTest {
        val store = InMemoryHistoryStore()
        val t = Instant.parse("2026-05-09T13:00:00Z")
        repeat(10) { i ->
            store.recordAttempt(
                Attempt(
                    id = "att-$i",
                    surahId = "1",
                    surahNameEn = "Al-Fatihah",
                    ayahNumber = 1,
                    score = 0.7,
                    jobId = "job-$i",
                    createdAt = t.plusSeconds(i.toLong()),
                    status = AttemptStatus.COMPLETED,
                ),
            )
        }
        val first5 = store.recentAttempts(5).first()
        assertEquals(5, first5.size)
        assertTrue(first5.all { it.id.startsWith("att-") })
    }

    private fun readFixture(): String =
        requireNotNull(javaClass.classLoader?.getResource("web-history-fixture.json"))
            .readText()
}
