package tv.every.tilawah.android.backend

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import tv.every.tilawah.android.app.AppError
import tv.every.tilawah.android.network.model.SurahSummary

class MockBackendTest {

    @Test
    fun `surahs returns configured success`() = runTest {
        val expected = listOf(
            SurahSummary("1", "الفاتحة", "Al-Fatihah", 7, "MECCA"),
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
    fun `ayahs lookup is parameterised by surahId`() = runTest {
        val backend = MockBackend(
            ayahsResult = { id ->
                if (id == "1") {
                    Result.success(emptyList())
                } else {
                    Result.failure(AppError.BackendUnavailable("ayahs"))
                }
            },
        )
        assertTrue(backend.ayahs("1").isEmpty())
        assertThrows(AppError.BackendUnavailable::class.java) {
            kotlinx.coroutines.runBlocking { backend.ayahs("99") }
        }
    }

    @Test
    fun `completedScoringResult builder produces a COMPLETED status`() {
        val result = completedScoringResult(jobId = "job-9", score = 0.91)
        assertEquals("job-9", result.jobId)
        assertEquals(0.91, result.score)
    }
}
