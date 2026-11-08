package com.tilawah.android.storage

import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.time.Instant

class DataStoreHistoryStoreTest {

    @get:Rule
    val folder = TemporaryFolder()

    private val t = Instant.parse("2026-01-04T12:00:00Z")

    @Test
    fun `replaceAll swaps the whole content for the snapshot`() = runTest {
        val store = DataStoreHistoryStore(
            PreferenceDataStoreFactory.create(scope = backgroundScope) {
                folder.newFile("history.preferences_pb")
            },
        )
        store.setLastPracticed(LastPracticed("1", 1, "Al-Fatihah", "الفاتحة", 7, t))
        store.recordBestScore("1", 1, 80, t)
        store.recordAttempt(attempt("old"))

        store.replaceAll(
            HistorySnapshot(
                lastPracticed = null,
                bestScores = mapOf("2:3" to BestScoreEntry(90, t)),
                attempts = listOf(attempt("new-2"), attempt("new-1")),
            ),
        )

        assertNull(store.lastPracticed().first())
        assertNull(store.bestScore("1", 1).first())
        assertEquals(90, store.bestScore("2", 3).first()?.score)
        assertEquals(listOf("new-2", "new-1"), store.recentAttempts().first().map { it.id })
    }

    private fun attempt(id: String) = Attempt(
        id = id,
        surahId = "1",
        surahNameEn = "Al-Fatihah",
        ayahNumber = 1,
        score = 70,
        jobId = "j-$id",
        createdAt = t,
        status = AttemptStatus.COMPLETED,
    )
}
