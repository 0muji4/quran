package com.quran.android.features.result

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import com.quran.android.app.AppError
import com.quran.android.audio.Player
import com.quran.android.backend.QuranBackend
import com.quran.android.backend.ScoringResultPayload
import com.quran.android.telemetry.Telemetry
import com.quran.android.telemetry.TelemetryAttribute
import com.quran.android.telemetry.TelemetryEvent

/**
 * Result-detail state container. Mirrors
 * `apps/ios/.../Features/Result/ResultDetailViewModel.swift`. Holds
 * the scoring payload and a pair of [Player]s for listen-back of the
 * teacher reference + the user's own recording.
 */
class ResultDetailViewModel(
    private val backend: QuranBackend,
    private val telemetry: Telemetry,
    private val jobId: String,
    private val surahId: String,
    private val ayahNumber: Int,
    initial: ScoringResultPayload? = null,
    val teacherPlayer: Player? = null,
    val youPlayer: Player? = null,
    private val recordingPath: String? = null,
) : ViewModel() {

    sealed interface UiState {
        data object Loading : UiState
        data class Loaded(val result: ScoringResultPayload) : UiState
        data class Failed(val error: AppError) : UiState
    }

    private val _state = MutableStateFlow<UiState>(
        if (initial != null) UiState.Loaded(initial) else UiState.Loading,
    )
    val state: StateFlow<UiState> = _state.asStateFlow()

    private var teacherLoaded = false
    private var youLoaded = false

    init {
        if (initial == null) {
            viewModelScope.launch { load() }
        }
    }

    suspend fun load() {
        _state.value = UiState.Loading
        try {
            _state.value = UiState.Loaded(backend.fetchScoringJob(jobId))
        } catch (cause: AppError) {
            telemetry.error(cause, mapOf("screen" to "result", "job_id" to jobId))
            _state.value = UiState.Failed(cause)
        }
    }

    fun playTeacher(referenceUrl: String) {
        val player = teacherPlayer ?: return
        viewModelScope.launch {
            youPlayer?.pause()
            if (!teacherLoaded) {
                runCatching { player.load(referenceUrl) }.onFailure {
                    if (it is AppError) telemetry.error(it, mapOf("section" to "teacher"))
                    return@launch
                }
                teacherLoaded = true
            }
            player.play()
        }
    }

    fun pauseTeacher() {
        teacherPlayer?.pause()
    }

    fun playYou() {
        val player = youPlayer ?: return
        val source = recordingPath ?: return
        viewModelScope.launch {
            teacherPlayer?.pause()
            if (!youLoaded) {
                runCatching { player.load(source) }.onFailure {
                    if (it is AppError) telemetry.error(it, mapOf("section" to "you"))
                    return@launch
                }
                youLoaded = true
            }
            player.play()
        }
    }

    fun pauseYou() {
        youPlayer?.pause()
    }

    fun tryAgain() {
        telemetry.event(
            TelemetryEvent.RESULT_TRY_AGAIN_TAPPED,
            mapOf(
                TelemetryAttribute.SURAH_ID to surahId,
                TelemetryAttribute.AYAH to ayahNumber.toString(),
            ),
        )
    }

    fun continueToNext() {
        telemetry.event(
            TelemetryEvent.RESULT_CONTINUE_TAPPED,
            mapOf(
                TelemetryAttribute.SURAH_ID to surahId,
                TelemetryAttribute.NEXT_AYAH to (ayahNumber + 1).toString(),
            ),
        )
    }

    override fun onCleared() {
        teacherPlayer?.release()
        youPlayer?.release()
        super.onCleared()
    }
}
