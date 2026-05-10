package com.tilawah.android.features.result

import kotlinx.coroutines.Dispatchers
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
import com.tilawah.android.app.AppError
import com.tilawah.android.backend.MockBackend
import com.tilawah.android.backend.completedScoringResult
import com.tilawah.android.telemetry.TelemetrySpy

class ResultDetailViewModelTests {

    private val dispatcher = StandardTestDispatcher()

    @Before fun setUp() { Dispatchers.setMain(dispatcher) }
    @After fun tearDown() { Dispatchers.resetMain() }

    @Test
    fun `init with initial value parks state in Loaded without backend call`() = runTest(dispatcher) {
        val backend = MockBackend()
        val viewModel = ResultDetailViewModel(
            backend = backend,
            telemetry = TelemetrySpy(),
            jobId = "job-1",
            surahId = "1",
            ayahNumber = 1,
            initial = completedScoringResult(jobId = "job-1", score = 0.81),
        )
        val loaded = viewModel.state.value as ResultDetailViewModel.UiState.Loaded
        assertEquals("job-1", loaded.result.jobId)
        assertTrue(backend.callLog.isEmpty())
    }

    @Test
    fun `load fetches scoring job from backend`() = runTest(dispatcher) {
        val backend = MockBackend(
            fetchScoringJobResult = { Result.success(completedScoringResult(it, score = 0.92)) },
        )
        val viewModel = ResultDetailViewModel(
            backend = backend,
            telemetry = TelemetrySpy(),
            jobId = "job-9",
            surahId = "1",
            ayahNumber = 1,
        )
        dispatcher.scheduler.advanceUntilIdle()
        val loaded = viewModel.state.value as ResultDetailViewModel.UiState.Loaded
        assertEquals(0.92, loaded.result.score!!, 0.0001)
    }

    @Test
    fun `load failure routes to Failed and reports error`() = runTest(dispatcher) {
        val backend = MockBackend(fetchScoringJobResult = { Result.failure(AppError.ScoringTimeout) })
        val telemetry = TelemetrySpy()
        val viewModel = ResultDetailViewModel(
            backend = backend,
            telemetry = telemetry,
            jobId = "job-1",
            surahId = "1",
            ayahNumber = 1,
        )
        dispatcher.scheduler.advanceUntilIdle()
        val failed = viewModel.state.value as ResultDetailViewModel.UiState.Failed
        assertEquals("scoring_timeout", failed.error.telemetryCode)
        val errorRecord = telemetry.records.filterIsInstance<TelemetrySpy.Record.Error>().single()
        assertEquals("scoring_timeout", errorRecord.code)
    }

    @Test
    fun `tryAgain and continueToNext emit telemetry events with attributes`() {
        val telemetry = TelemetrySpy()
        val viewModel = ResultDetailViewModel(
            backend = MockBackend(),
            telemetry = telemetry,
            jobId = "job-1",
            surahId = "2",
            ayahNumber = 5,
            initial = completedScoringResult(),
        )
        viewModel.tryAgain()
        viewModel.continueToNext()
        val events = telemetry.records.filterIsInstance<TelemetrySpy.Record.Event>().map { it.name }
        assertTrue(events.contains("result.try_again.tapped"))
        assertTrue(events.contains("result.continue.tapped"))
    }
}
