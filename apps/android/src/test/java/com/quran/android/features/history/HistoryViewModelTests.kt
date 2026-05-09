package com.quran.android.features.history

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import com.quran.android.storage.Attempt
import com.quran.android.storage.AttemptStatus
import com.quran.android.storage.InMemoryHistoryStore
import java.time.Instant

class HistoryViewModelTests {

    private val dispatcher = StandardTestDispatcher()

    @Before fun setUp() { Dispatchers.setMain(dispatcher) }
    @After fun tearDown() { Dispatchers.resetMain() }

    @Test
    fun `filteredAttempts mirrors HistoryStore when filter is All`() = runTest(dispatcher) {
        val store = InMemoryHistoryStore()
        store.recordAttempt(attempt("a", "1", "Al-Fatihah", 1))
        store.recordAttempt(attempt("b", "2", "Al-Baqarah", 5))
        val viewModel = HistoryViewModel(store)
        dispatcher.scheduler.advanceUntilIdle()
        assertEquals(listOf("b", "a"), viewModel.filteredAttempts.first().map { it.id })
    }

    @Test
    fun `filteredAttempts narrows to selected surah`() = runTest(dispatcher) {
        val store = InMemoryHistoryStore()
        store.recordAttempt(attempt("a", "1", "Al-Fatihah", 1))
        store.recordAttempt(attempt("b", "2", "Al-Baqarah", 5))
        store.recordAttempt(attempt("c", "1", "Al-Fatihah", 2))
        val viewModel = HistoryViewModel(store)
        dispatcher.scheduler.advanceUntilIdle()
        viewModel.setFilter(HistoryFilter.Surah("1", "Al-Fatihah"))
        dispatcher.scheduler.advanceUntilIdle()
        assertEquals(listOf("c", "a"), viewModel.filteredAttempts.first().map { it.id })
    }

    @Test
    fun `filterOptions exposes top distinct surahs prepended by All`() = runTest(dispatcher) {
        val store = InMemoryHistoryStore()
        listOf(
            attempt("a", "1", "Al-Fatihah", 1),
            attempt("b", "2", "Al-Baqarah", 5),
            attempt("c", "1", "Al-Fatihah", 2),
            attempt("d", "3", "Aal-Imran", 7),
        ).forEach { store.recordAttempt(it) }
        val viewModel = HistoryViewModel(store)
        dispatcher.scheduler.advanceUntilIdle()
        val options = viewModel.filterOptions.first()
        // All + 3 surahs (most recent first)
        assertEquals(4, options.size)
        assertTrue(options.first() == HistoryFilter.All)
        assertEquals("3", (options[1] as HistoryFilter.Surah).id)
        assertEquals("1", (options[2] as HistoryFilter.Surah).id)
        assertEquals("2", (options[3] as HistoryFilter.Surah).id)
    }

    private fun attempt(id: String, surahId: String, surahNameEn: String, ayahNumber: Int) = Attempt(
        id = id,
        surahId = surahId,
        surahNameEn = surahNameEn,
        ayahNumber = ayahNumber,
        score = 0.7,
        jobId = "job-$id",
        createdAt = Instant.parse("2026-05-09T13:00:00Z").plusSeconds(id.first().code.toLong()),
        status = AttemptStatus.COMPLETED,
        durationMs = 1_000,
    )
}
