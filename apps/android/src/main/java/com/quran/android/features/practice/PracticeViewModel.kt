package com.quran.android.features.practice

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import com.quran.android.app.AppError
import com.quran.android.audio.Player
import com.quran.android.audio.Recorder
import com.quran.android.audio.RecordingResult
import com.quran.android.backend.AyahDetail
import com.quran.android.backend.QuranBackend
import com.quran.android.backend.ScoringResultPayload
import com.quran.android.backend.ScoringStatus
import com.quran.android.backend.SurahSummary
import com.quran.android.storage.Attempt
import com.quran.android.storage.AttemptStatus
import com.quran.android.storage.HistoryStore
import com.quran.android.storage.LastPracticed
import com.quran.android.telemetry.Telemetry
import com.quran.android.telemetry.TelemetryAttribute
import com.quran.android.telemetry.TelemetryEvent
import java.time.Instant
import java.util.UUID

/**
 * Practice tab state container. Mirrors
 * `apps/ios/.../Features/Practice/PracticeViewModel.swift`. Drives
 * the full Recording -> Uploading -> Analysing -> Done arc; PR 16
 * adds the analysing checklist UI + error panel; PR 17 wires the
 * Result navigation.
 */
class PracticeViewModel(
    private val backend: QuranBackend,
    private val recorder: Recorder,
    val player: Player,
    private val historyStore: HistoryStore,
    private val telemetry: Telemetry,
    private val surahId: String,
    private val ayahNumber: Int,
    private val pollAttempts: Int = DEFAULT_POLL_ATTEMPTS,
    private val pollIntervalMs: Long = DEFAULT_POLL_INTERVAL_MS,
) : ViewModel() {

    private val _state = MutableStateFlow<PracticeState>(PracticeState.Idle)
    val state: StateFlow<PracticeState> = _state.asStateFlow()

    private val _ayah = MutableStateFlow<AyahDetail?>(null)
    val ayah: StateFlow<AyahDetail?> = _ayah.asStateFlow()

    private val _surah = MutableStateFlow<SurahSummary?>(null)
    val surah: StateFlow<SurahSummary?> = _surah.asStateFlow()

    private val _reference = MutableStateFlow<TeacherReferenceState>(TeacherReferenceState.Loading)
    val reference: StateFlow<TeacherReferenceState> = _reference.asStateFlow()

    private var referencePlayedOnce: Boolean = false
    private var recorderObserverJob: Job? = null
    var lastRecording: RecordingResult? = null
        private set

    init {
        viewModelScope.launch { loadAyah() }
        viewModelScope.launch { loadSurah() }
        viewModelScope.launch { loadReference() }
    }

    /** Suspending helper exposed for unit tests. */
    suspend fun loadAyah() {
        try {
            _ayah.value = backend.ayah(surahId, ayahNumber)
        } catch (cause: AppError) {
            telemetry.error(cause, mapOf("screen" to "practice"))
            _state.value = PracticeState.Error(cause)
        }
    }

    suspend fun loadSurah() {
        try {
            _surah.value = backend.surah(surahId)
        } catch (cause: AppError) {
            telemetry.error(cause, mapOf("screen" to "practice", "section" to "surah"))
        }
    }

    suspend fun loadReference() {
        _reference.value = TeacherReferenceState.Loading
        try {
            val audio = backend.referenceAudio(surahId, ayahNumber)
            player.load(audio.signedUrl)
            _reference.value = TeacherReferenceState.Ready(player.state.value)
        } catch (cause: AppError.ReferenceUnavailable) {
            _reference.value = TeacherReferenceState.Unavailable(cause)
        } catch (cause: AppError) {
            telemetry.error(cause, mapOf("screen" to "practice", "section" to "reference"))
            _reference.value = TeacherReferenceState.Unavailable(
                AppError.ReferenceUnavailable(surahId, ayahNumber),
            )
        }
    }

    fun playReference() {
        player.play()
        if (!referencePlayedOnce) {
            referencePlayedOnce = true
            telemetry.event(
                TelemetryEvent.PRACTICE_REFERENCE_PLAYED,
                mapOf(
                    TelemetryAttribute.SURAH_ID to surahId,
                    TelemetryAttribute.AYAH to ayahNumber.toString(),
                ),
            )
        }
        refreshReferenceFromPlayer()
    }

    fun pauseReference() {
        player.pause()
        refreshReferenceFromPlayer()
    }

    fun setReferenceRate(rate: Float) {
        player.setRate(rate)
        refreshReferenceFromPlayer()
    }

    fun retryReference() {
        viewModelScope.launch { loadReference() }
    }

    fun startRecording() {
        viewModelScope.launch {
            try {
                player.pause()
                recorder.start()
                _state.value = PracticeState.Recording(meters = emptyList(), durationMs = 0L)
                telemetry.event(
                    TelemetryEvent.PRACTICE_RECORDING_STARTED,
                    mapOf(
                        TelemetryAttribute.SURAH_ID to surahId,
                        TelemetryAttribute.AYAH to ayahNumber.toString(),
                    ),
                )
                observeRecorderState()
            } catch (cause: AppError) {
                telemetry.error(cause, mapOf("screen" to "practice", "section" to "recording"))
                _state.value = PracticeState.Error(cause)
            }
        }
    }

    fun resetIdle() {
        recorder.cancel()
        _state.value = PracticeState.Idle
    }

    /** Convenience used by PracticeScreen's Replay action. */
    fun viewModelScopeLaunchUploadAndScore(recording: RecordingResult) {
        viewModelScope.launch { uploadAndScore(recording) }
    }

    fun stopRecording() {
        viewModelScope.launch {
            recorderObserverJob?.cancel()
            recorderObserverJob = null
            try {
                val result = recorder.stop()
                lastRecording = result
                telemetry.event(
                    TelemetryEvent.PRACTICE_RECORDING_STOPPED,
                    mapOf(TelemetryAttribute.DURATION_MS to result.durationMs.toString()),
                )
                uploadAndScore(result)
            } catch (cause: AppError) {
                telemetry.error(cause, mapOf("screen" to "practice", "section" to "recording"))
                _state.value = PracticeState.Error(cause)
            }
        }
    }

    /** Suspending helper exposed for unit tests; safe to call directly. */
    suspend fun uploadAndScore(recording: RecordingResult) {
        _state.value = PracticeState.Uploading
        try {
            val signed = telemetry.measure(TelemetryEvent.PRACTICE_UPLOAD_COMPLETED) {
                val payload = backend.requestSignedUploadUrl(
                    filename = recording.file.name,
                    contentType = AUDIO_M4A,
                )
                backend.uploadAudio(recording.file, payload.url, AUDIO_M4A)
                payload
            }
            val job = backend.createScoringJob(
                uploadKey = signed.uploadKey,
                surahId = surahId,
                ayahNumber = ayahNumber,
                sessionId = null,
            )
            val finalJob = telemetry.measure(TelemetryEvent.PRACTICE_SCORING_COMPLETED) {
                pollUntilTerminal(job)
            }
            recordHistory(finalJob, recording)
            _state.value = PracticeState.Done(score = finalJob.score, jobId = finalJob.jobId)
        } catch (cause: AppError) {
            telemetry.error(cause, mapOf("screen" to "practice", "section" to "scoring"))
            telemetry.event(
                TelemetryEvent.PRACTICE_SCORING_FAILED,
                mapOf(TelemetryAttribute.ERROR_CODE to cause.telemetryCode),
            )
            _state.value = PracticeState.Error(cause)
        }
    }

    private suspend fun pollUntilTerminal(initial: ScoringResultPayload): ScoringResultPayload {
        if (initial.status == ScoringStatus.Completed || initial.status == ScoringStatus.Failed) {
            return initial
        }
        for (attempt in 1..pollAttempts) {
            _state.value = PracticeState.Analysing(stepFor(attempt))
            delay(pollIntervalMs)
            val refreshed = backend.fetchScoringJob(initial.jobId)
            if (refreshed.status == ScoringStatus.Completed || refreshed.status == ScoringStatus.Failed) {
                return refreshed
            }
        }
        throw AppError.ScoringTimeout
    }

    private fun stepFor(attempt: Int): AnalysingStep = when {
        attempt <= 2 -> AnalysingStep.Transcribing
        attempt <= 5 -> AnalysingStep.Comparing
        else -> AnalysingStep.Calculating
    }

    private suspend fun recordHistory(
        job: ScoringResultPayload,
        recording: RecordingResult,
    ) {
        val now = Instant.now()
        val surahName = _surah.value?.nameEn ?: surahId
        val surahNameAr = _surah.value?.nameAr ?: ""
        val ayahCount = _surah.value?.ayahCount ?: 0
        val attempt = Attempt(
            id = UUID.randomUUID().toString(),
            surahId = surahId,
            surahNameEn = surahName,
            ayahNumber = ayahNumber,
            score = job.score,
            jobId = job.jobId,
            createdAt = now,
            status = if (job.status == ScoringStatus.Completed) AttemptStatus.COMPLETED else AttemptStatus.FAILED,
            durationMs = recording.durationMs,
        )
        historyStore.recordAttempt(attempt)
        historyStore.setLastPracticed(
            LastPracticed(
                surahId = surahId,
                ayahNumber = ayahNumber,
                surahNameEn = surahName,
                surahNameAr = surahNameAr,
                ayahCount = ayahCount,
                practicedAt = now,
            ),
        )
        job.score?.takeIf { job.status == ScoringStatus.Completed }?.let { score ->
            historyStore.recordBestScore(surahId, ayahNumber, score, now)
        }
    }

    private fun observeRecorderState() {
        recorderObserverJob?.cancel()
        recorderObserverJob = viewModelScope.launch {
            recorder.state.collect { rs ->
                if (_state.value is PracticeState.Recording) {
                    _state.value = PracticeState.Recording(rs.meters, rs.durationMs)
                }
            }
        }
    }

    private fun refreshReferenceFromPlayer() {
        if (_reference.value is TeacherReferenceState.Ready) {
            _reference.value = TeacherReferenceState.Ready(player.state.value)
        }
    }

    override fun onCleared() {
        player.release()
        super.onCleared()
    }

    companion object {
        const val DEFAULT_POLL_ATTEMPTS = 20
        const val DEFAULT_POLL_INTERVAL_MS = 2_000L
        const val AUDIO_M4A = "audio/m4a"
    }
}
