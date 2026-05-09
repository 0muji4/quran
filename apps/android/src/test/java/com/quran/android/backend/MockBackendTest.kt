package com.quran.android.backend

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import com.quran.android.app.AppError

class MockBackendTest {

    @Test
    fun `surahs returns configured success`() = runTest {
        val expected = listOf(
            SurahSummary("1", "الفاتحة", "Al-Fatihah", "MECCA", 7),
        )
        val backend = MockBackend(surahsResult = Result.success(expected))
        assertEquals(expected, backend.surahs())
        assertEquals(listOf("surahs"), backend.callLog)
    }

    @Test
    fun `surahs propagates configured AppError`() = runTest {
        val backend = MockBackend(
            surahsResult = Result.failure(AppError.Network(IllegalStateException("offline"))),
        )
        val thrown = assertThrows(AppError.Network::class.java) {
            kotlinx.coroutines.runBlocking { backend.surahs() }
        }
        assertEquals("network", thrown.telemetryCode)
    }

    @Test
    fun `ayah lookup is parameterised by surahId and number`() = runTest {
        val match = AyahDetail("ayah-1-1", "1", 1, "ا", null, null)
        val backend = MockBackend(
            ayahLookup = { surah, num ->
                if (surah == "1" && num == 1) Result.success(match) else Result.success(null)
            },
        )
        assertEquals(match, backend.ayah("1", 1))
        assertEquals(null, backend.ayah("1", 2))
    }

    @Test
    fun `referenceAudio defaults to AppError ReferenceUnavailable`() = runTest {
        val backend = MockBackend()
        assertThrows(AppError.ReferenceUnavailable::class.java) {
            kotlinx.coroutines.runBlocking { backend.referenceAudio("1", 1) }
        }
    }

    @Test
    fun `completedScoringResult builder produces a Completed status`() {
        val result = completedScoringResult(jobId = "job-9", score = 0.91)
        assertEquals("job-9", result.jobId)
        assertEquals(0.91, result.score!!, 0.0)
        assertEquals(ScoringStatus.Completed, result.status)
    }

    @Test
    fun `callLog tracks every backend call`() = runTest {
        val backend = MockBackend(
            surahsResult = Result.success(emptyList()),
            ayahsResult = { Result.success(emptyList()) },
        )
        backend.surahs()
        backend.ayahs("1")
        assertTrue(backend.callLog == listOf("surahs", "ayahs(1)"))
    }
}
