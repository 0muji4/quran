package com.tilawah.android.features.library

import app.cash.turbine.test
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import com.tilawah.android.app.AppError
import com.tilawah.android.backend.MockBackend
import com.tilawah.android.backend.SurahSummary
import com.tilawah.android.storage.BestScoreEntry
import com.tilawah.android.storage.HistorySnapshot
import com.tilawah.android.storage.InMemoryHistoryStore
import com.tilawah.android.storage.SignInGatedHistoryStore
import com.tilawah.android.telemetry.TelemetrySpy
import java.time.Instant

class LibraryViewModelTests {

    @Test
    fun `load transitions Idle to Loaded on success and emits library_fetch_succeeded`() = runTest {
        val backend = MockBackend(surahsResult = Result.success(fixtures))
        val telemetry = TelemetrySpy()
        val viewModel = LibraryViewModel(backend, telemetry)

        viewModel.state.test {
            assertEquals(LibraryUiState.Idle, awaitItem())
            viewModel.loadInternal()
            assertEquals(LibraryUiState.Loading, awaitItem())
            val loaded = awaitItem() as LibraryUiState.Loaded
            assertEquals(listOf("1", "2"), loaded.surahs.map { it.id })
            cancelAndIgnoreRemainingEvents()
        }
        assertTrue(telemetry.eventNames.contains("library.fetch.succeeded"))
    }

    @Test
    fun `load transitions to Failed on AppError network and emits library_fetch_failed`() = runTest {
        val backend = MockBackend(
            surahsResult = Result.failure(AppError.Network(IllegalStateException("offline"))),
        )
        val telemetry = TelemetrySpy()
        val viewModel = LibraryViewModel(backend, telemetry)

        viewModel.loadInternal()
        val failed = viewModel.state.value as LibraryUiState.Failed
        assertEquals("network", failed.error.telemetryCode)
        assertTrue(telemetry.eventNames.contains("library.fetch.failed"))
        val errorRecord = telemetry.records.filterIsInstance<TelemetrySpy.Record.Error>().single()
        assertEquals("network", errorRecord.code)
        assertEquals(mapOf("screen" to "library"), errorRecord.context)
    }

    @Test
    fun `bestScores follows sign-in and later cache writes`() = runTest {
        Dispatchers.setMain(UnconfinedTestDispatcher(testScheduler))
        try {
            val cache = InMemoryHistoryStore()
            val signedIn = MutableStateFlow(false)
            val viewModel = LibraryViewModel(
                backend = MockBackend(),
                telemetry = TelemetrySpy(),
                historyStore = SignInGatedHistoryStore(cache, signedIn),
            )
            assertEquals(emptyMap<String, Int>(), viewModel.bestScores.value)

            signedIn.value = true
            cache.replaceAll(
                HistorySnapshot(
                    lastPracticed = null,
                    bestScores = mapOf("1:1" to BestScoreEntry(95, Instant.parse("2026-01-04T12:00:00Z"))),
                    attempts = emptyList(),
                ),
            )

            assertEquals(mapOf("1" to 95), viewModel.bestScores.value)
        } finally {
            Dispatchers.resetMain()
        }
    }

    @Test
    fun `surahOpened emits library_surah_opened with surah_id`() {
        val telemetry = TelemetrySpy()
        val viewModel = LibraryViewModel(MockBackend(), telemetry)
        viewModel.surahOpened(fixtures.first())
        val event = telemetry.records.filterIsInstance<TelemetrySpy.Record.Event>().single()
        assertEquals("library.surah.opened", event.name)
        assertEquals("1", event.attributes["surah_id"])
    }

    private val fixtures = listOf(
        SurahSummary("1", "الفاتحة", "Al-Fatihah", "Mecca", 7),
        SurahSummary("2", "البقرة", "Al-Baqarah", "Medina", 286),
    )
}
