package com.quran.android.features.history

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import com.quran.android.storage.Attempt
import com.quran.android.storage.AttemptStatus
import java.time.Duration
import java.time.Instant

class StatsTests {

    private val now: Instant = Instant.parse("2026-05-09T12:00:00Z")

    @Test
    fun `empty attempts produces zero counts and null averages`() {
        val stats = computeStats(emptyList(), now)
        assertEquals(0, stats.thisWeekCount)
        assertNull(stats.averagePercent)
        assertNull(stats.bestPercent)
        assertEquals(0, stats.streakDays)
    }

    @Test
    fun `thisWeek counts only the trailing 7 day window`() {
        val attempts = listOf(
            attempt("a", now.minus(Duration.ofDays(2)), 0.7),
            attempt("b", now.minus(Duration.ofDays(6)), 0.6),
            attempt("c", now.minus(Duration.ofDays(8)), 0.5),
        )
        assertEquals(2, computeStats(attempts, now).thisWeekCount)
    }

    @Test
    fun `average and best fold completed scores`() {
        val attempts = listOf(
            attempt("a", now, 0.8),
            attempt("b", now, 0.5, AttemptStatus.FAILED),
            attempt("c", now, 0.95),
        )
        val stats = computeStats(attempts, now)
        assertEquals(87.5, stats.averagePercent!!, 0.001)
        assertEquals(95.0, stats.bestPercent!!, 0.001)
    }

    @Test
    fun `streak counts consecutive days backwards from today`() {
        val attempts = listOf(
            attempt("a", now),
            attempt("b", now.minus(Duration.ofDays(1))),
            attempt("c", now.minus(Duration.ofDays(2))),
            attempt("d", now.minus(Duration.ofDays(4))), // gap breaks
        )
        assertEquals(3, computeStats(attempts, now).streakDays)
    }

    private fun attempt(
        id: String,
        createdAt: Instant,
        score: Double = 0.7,
        status: AttemptStatus = AttemptStatus.COMPLETED,
    ) = Attempt(
        id = id,
        surahId = "1",
        surahNameEn = "Al-Fatihah",
        ayahNumber = 1,
        score = score,
        jobId = "job-$id",
        createdAt = createdAt,
        status = status,
        durationMs = 1_000,
    )
}
