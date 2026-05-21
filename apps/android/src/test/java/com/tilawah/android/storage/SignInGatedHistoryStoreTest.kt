package com.tilawah.android.storage

import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

class SignInGatedHistoryStoreTest {

    private fun lastPracticed() = LastPracticed(
        surahId = "1",
        ayahNumber = 1,
        surahNameEn = "Al-Fatihah",
        surahNameAr = "الفاتحة",
        ayahCount = 7,
        practicedAt = Instant.parse("2026-01-04T12:00:00Z"),
    )

    private fun attempt(id: String = "a1") = Attempt(
        id = id,
        surahId = "1",
        surahNameEn = "Al-Fatihah",
        ayahNumber = 1,
        score = 92.0,
        jobId = "j-$id",
        createdAt = Instant.parse("2026-01-04T12:00:00Z"),
        status = AttemptStatus.COMPLETED,
    )

    @Test
    fun `reads return empty when signed out`() = runTest {
        val base = InMemoryHistoryStore()
        base.setLastPracticed(lastPracticed())
        base.recordBestScore("1", 1, 90.0, Instant.parse("2026-01-04T12:00:00Z"))
        base.recordAttempt(attempt())
        val gated = SignInGatedHistoryStore(base, isSignedIn = { false })

        assertNull(gated.lastPracticed().first())
        assertNull(gated.bestScore("1", 1).first())
        assertNull(gated.bestScoreForSurah("1").first())
        assertTrue(gated.recentAttempts().first().isEmpty())
    }

    @Test
    fun `reads pass through when signed in`() = runTest {
        val base = InMemoryHistoryStore()
        base.setLastPracticed(lastPracticed())
        base.recordBestScore("1", 1, 90.0, Instant.parse("2026-01-04T12:00:00Z"))
        base.recordAttempt(attempt())
        val gated = SignInGatedHistoryStore(base, isSignedIn = { true })

        assertEquals(lastPracticed(), gated.lastPracticed().first())
        assertEquals(90.0, gated.bestScore("1", 1).first()?.score!!, 0.0001)
        assertEquals(90.0, gated.bestScoreForSurah("1").first()!!, 0.0001)
        assertEquals(1, gated.recentAttempts().first().size)
    }

    @Test
    fun `writes are dropped when signed out`() = runTest {
        val base = InMemoryHistoryStore()
        val gated = SignInGatedHistoryStore(base, isSignedIn = { false })

        gated.setLastPracticed(lastPracticed())
        gated.recordBestScore("1", 1, 90.0, Instant.parse("2026-01-04T12:00:00Z"))
        gated.recordAttempt(attempt())

        assertNull(base.lastPracticed().first())
        assertNull(base.bestScore("1", 1).first())
        assertTrue(base.recentAttempts().first().isEmpty())
    }

    @Test
    fun `writes pass through when signed in`() = runTest {
        val base = InMemoryHistoryStore()
        val gated = SignInGatedHistoryStore(base, isSignedIn = { true })

        gated.setLastPracticed(lastPracticed())
        gated.recordBestScore("1", 1, 90.0, Instant.parse("2026-01-04T12:00:00Z"))
        gated.recordAttempt(attempt())

        assertEquals(lastPracticed(), base.lastPracticed().first())
        assertNotNull(base.bestScore("1", 1).first())
        assertEquals(1, base.recentAttempts().first().size)
    }

    @Test
    fun `clear always delegates regardless of session state`() = runTest {
        val base = InMemoryHistoryStore()
        base.setLastPracticed(lastPracticed())
        base.recordAttempt(attempt())
        // Sign-out path: the gate has flipped to false but we MUST
        // still be able to wipe the cache to prevent leaks to the next
        // user.
        val gated = SignInGatedHistoryStore(base, isSignedIn = { false })

        gated.clear()

        assertNull(base.lastPracticed().first())
        assertTrue(base.recentAttempts().first().isEmpty())
    }

    @Test
    fun `refreshFromRemote always delegates regardless of session state`() = runTest {
        var refreshes = 0
        val base = object : HistoryStore by InMemoryHistoryStore() {
            override suspend fun refreshFromRemote() {
                refreshes++
            }
        }
        // refresh is fired by AppRoot exactly as the session transitions
        // to signed-in; a guard here would race the bridge.
        val gated = SignInGatedHistoryStore(base, isSignedIn = { false })

        gated.refreshFromRemote()

        assertEquals(1, refreshes)
    }

    @Test
    fun `signed-in flag is evaluated per call`() = runTest {
        val base = InMemoryHistoryStore()
        var signedIn = false
        val gated = SignInGatedHistoryStore(base, isSignedIn = { signedIn })

        // While signed out, the write is dropped.
        gated.setLastPracticed(lastPracticed())
        assertNull(base.lastPracticed().first())

        // After signing in, the same call goes through.
        signedIn = true
        gated.setLastPracticed(lastPracticed())
        assertNotNull(base.lastPracticed().first())
    }
}
