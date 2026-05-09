package com.tilawah.android.features.practice

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import com.tilawah.android.app.AppError
import com.tilawah.android.audio.Player
import com.tilawah.android.audio.PlayerState
import com.tilawah.android.audio.Recorder
import com.tilawah.android.audio.RecorderState
import com.tilawah.android.audio.RecordingResult
import com.tilawah.android.backend.MockBackend
import com.tilawah.android.backend.ScoringResultPayload
import com.tilawah.android.backend.ScoringStatus
import com.tilawah.android.backend.SignedUploadPayload
import com.tilawah.android.backend.SurahSummary
import com.tilawah.android.backend.completedScoringResult
import com.tilawah.android.storage.HistoryStore
import com.tilawah.android.storage.InMemoryHistoryStore
import com.tilawah.android.telemetry.TelemetrySpy
import java.io.File

class PracticeEndToEndTests {

    private val dispatcher = StandardTestDispatcher()

    @Before fun setUp() { Dispatchers.setMain(dispatcher) }
    @After fun tearDown() { Dispatchers.resetMain() }

    @Test
    fun `successful scoring transitions Idle to Done and records history`() = runTest(dispatcher) {
        val historyStore = InMemoryHistoryStore()
        val backend = MockBackend(
            surahLookup = { Result.success(SurahSummary("1", "الفاتحة", "Al-Fatihah", "Mecca", 7)) },
            signedUploadResult = Result.success(
                SignedUploadPayload("https://upload.example/uploads/recording.m4a", "exp", "recording.m4a"),
            ),
            uploadResult = Result.success(Unit),
            createScoringJobResult = Result.success(completedScoringResult(jobId = "job-1", score = 0.9)),
        )
        val telemetry = TelemetrySpy()
        val viewModel = newViewModel(backend, historyStore, telemetry)
        dispatcher.scheduler.advanceUntilIdle()

        val recording = RecordingResult(file = File("/tmp/recording.m4a"), durationMs = 5_000L)
        viewModel.uploadAndScore(recording)
        dispatcher.scheduler.advanceUntilIdle()

        val state = viewModel.state.value as PracticeState.Done
        assertEquals(0.9, state.score!!, 0.0001)
        assertEquals("job-1", state.jobId)
        assertTrue(telemetry.eventNames.contains("practice.upload.completed.succeeded"))
        assertTrue(telemetry.eventNames.contains("practice.scoring.completed.succeeded"))
        val attempts = historyStore.recentAttempts().first()
        assertEquals(1, attempts.size)
        assertEquals("Al-Fatihah", attempts.first().surahNameEn)
        assertEquals(0.9, attempts.first().score!!, 0.0001)
        assertEquals(0.9, historyStore.bestScore("1", 1).first()?.score)
        val last = historyStore.lastPracticed().first()!!
        assertEquals("Al-Fatihah", last.surahNameEn)
        assertEquals(7, last.ayahCount)
    }

    @Test
    fun `pollUntilTerminal exhausting attempts surfaces ScoringTimeout`() = runTest(dispatcher) {
        val backend = MockBackend(
            surahLookup = { Result.success(SurahSummary("1", "الفاتحة", "Al-Fatihah", "Mecca", 7)) },
            signedUploadResult = Result.success(
                SignedUploadPayload("https://upload.example/uploads/recording.m4a", "exp", "recording.m4a"),
            ),
            uploadResult = Result.success(Unit),
            createScoringJobResult = Result.success(
                ScoringResultPayload(
                    jobId = "job-1",
                    status = ScoringStatus.Running,
                    score = null,
                    verdict = null,
                    segments = emptyList(),
                    feedback = null,
                ),
            ),
            fetchScoringJobResult = {
                Result.success(
                    ScoringResultPayload(
                        jobId = "job-1",
                        status = ScoringStatus.Running,
                        score = null,
                        verdict = null,
                        segments = emptyList(),
                        feedback = null,
                    ),
                )
            },
        )
        val telemetry = TelemetrySpy()
        val viewModel = newViewModel(
            backend,
            InMemoryHistoryStore(),
            telemetry,
            pollAttempts = 2,
            pollIntervalMs = 1L,
        )
        dispatcher.scheduler.advanceUntilIdle()

        viewModel.uploadAndScore(RecordingResult(File("/tmp/r.m4a"), 1_000L))
        dispatcher.scheduler.advanceUntilIdle()

        val err = viewModel.state.value as PracticeState.Error
        assertEquals("scoring_timeout", err.error.telemetryCode)
        assertTrue(telemetry.eventNames.contains("practice.scoring.failed"))
    }

    @Test
    fun `network error during upload routes to Error and emits scoring failed event`() = runTest(dispatcher) {
        val backend = MockBackend(
            surahLookup = { Result.success(SurahSummary("1", "الفاتحة", "Al-Fatihah", "Mecca", 7)) },
            signedUploadResult = Result.failure(AppError.Network(IllegalStateException("offline"))),
        )
        val telemetry = TelemetrySpy()
        val viewModel = newViewModel(backend, InMemoryHistoryStore(), telemetry)
        dispatcher.scheduler.advanceUntilIdle()

        viewModel.uploadAndScore(RecordingResult(File("/tmp/r.m4a"), 1_000L))
        dispatcher.scheduler.advanceUntilIdle()

        val err = viewModel.state.value as PracticeState.Error
        assertEquals("network", err.error.telemetryCode)
        assertTrue(telemetry.eventNames.contains("practice.upload.completed.failed"))
        assertTrue(telemetry.eventNames.contains("practice.scoring.failed"))
        assertNull(viewModel.lastRecording)
    }

    private fun newViewModel(
        backend: MockBackend,
        historyStore: HistoryStore,
        telemetry: TelemetrySpy,
        pollAttempts: Int = 5,
        pollIntervalMs: Long = 1L,
    ): PracticeViewModel = PracticeViewModel(
        backend = backend,
        recorder = StubRecorder,
        player = StubPlayer,
        historyStore = historyStore,
        telemetry = telemetry,
        surahId = "1",
        ayahNumber = 1,
        pollAttempts = pollAttempts,
        pollIntervalMs = pollIntervalMs,
    )

    private object StubRecorder : Recorder {
        override val state: StateFlow<RecorderState> = MutableStateFlow(RecorderState())
        override suspend fun start() = Unit
        override suspend fun stop(): RecordingResult = RecordingResult(File("/tmp/r.m4a"), 1_000L)
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
