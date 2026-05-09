package com.quran.android.features.practice

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import com.quran.android.app.AppError
import com.quran.android.audio.Player
import com.quran.android.audio.PlayerState
import com.quran.android.audio.Recorder
import com.quran.android.audio.RecorderState
import com.quran.android.audio.RecordingResult
import com.quran.android.backend.AyahDetail
import com.quran.android.backend.MockBackend
import com.quran.android.storage.InMemoryHistoryStore
import com.quran.android.telemetry.TelemetrySpy

class PracticeViewModelTests {

    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setupMain() {
        Dispatchers.setMain(testDispatcher)
    }

    @After
    fun tearDownMain() {
        Dispatchers.resetMain()
    }

    @Test
    fun `init loads ayah successfully and stays in Idle state`() = runTest(testDispatcher) {
        val ayah = AyahDetail("ayah-1-1", "1", 1, "ا", "Praise", null)
        val backend = MockBackend(ayahLookup = { _, _ -> Result.success(ayah) })
        val viewModel = newViewModel(backend, TelemetrySpy())
        testDispatcher.scheduler.advanceUntilIdle()
        assertEquals(ayah, viewModel.ayah.value)
        assertEquals(PracticeState.Idle, viewModel.state.value)
    }

    @Test
    fun `loadAyah failure transitions to Error and emits telemetry`() = runTest(testDispatcher) {
        val backend = MockBackend(
            ayahLookup = { _, _ -> Result.failure(AppError.Network(IllegalStateException("offline"))) },
        )
        val telemetry = TelemetrySpy()
        val viewModel = newViewModel(backend, telemetry)
        testDispatcher.scheduler.advanceUntilIdle()
        val errorState = viewModel.state.value as PracticeState.Error
        assertEquals("network", errorState.error.telemetryCode)
        val errorRecord = telemetry.records.filterIsInstance<TelemetrySpy.Record.Error>().single()
        assertEquals("network", errorRecord.code)
        assertTrue(errorRecord.context["screen"] == "practice")
    }

    @Test
    fun `Idle is not busy and Uploading and Analysing are`() {
        assertTrue(!PracticeState.Idle.isBusy)
        assertTrue(PracticeState.Uploading.isBusy)
        assertTrue(PracticeState.Analysing(AnalysingStep.Transcribing).isBusy)
    }

    private fun newViewModel(
        backend: MockBackend,
        telemetry: TelemetrySpy,
    ): PracticeViewModel = PracticeViewModel(
        backend = backend,
        recorder = StubRecorder,
        player = StubPlayer,
        historyStore = InMemoryHistoryStore(),
        telemetry = telemetry,
        surahId = "1",
        ayahNumber = 1,
    )

    private object StubRecorder : Recorder {
        override val state: StateFlow<RecorderState> = MutableStateFlow(RecorderState())
        override suspend fun start() = Unit
        override suspend fun stop(): RecordingResult = error("not used in PR 12 tests")
        override fun cancel() = Unit
    }

    private object StubPlayer : Player {
        override val state: StateFlow<PlayerState> = MutableStateFlow(PlayerState())
        override suspend fun load(source: String) = Unit
        override fun play() = Unit
        override fun pause() = Unit
        override fun stop() = Unit
        override fun seekTo(positionMs: Long) = Unit
        override fun setRate(rate: Float) = Unit
        override fun release() = Unit
    }
}
