package com.tilawah.android.features.library

import app.cash.turbine.test
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import com.tilawah.android.app.AppError
import com.tilawah.android.backend.MockBackend
import com.tilawah.android.backend.SurahSummary
import com.tilawah.android.telemetry.TelemetrySpy

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
