package tv.every.tilawah.android.features.result

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.every.tilawah.android.app.AppError
import tv.every.tilawah.android.backend.QuranBackend
import tv.every.tilawah.android.backend.ScoringResultPayload
import tv.every.tilawah.android.telemetry.Telemetry
import tv.every.tilawah.android.telemetry.TelemetryAttribute
import tv.every.tilawah.android.telemetry.TelemetryEvent

/**
 * Result-detail state container. Mirrors
 * `apps/ios/.../Features/Result/ResultDetailViewModel.swift`. Loads
 * the scoring result on init; PRs 19–21 add the metric bars, word-
 * comparison grid, listen-back row, and CTA wiring.
 */
class ResultDetailViewModel(
    private val backend: QuranBackend,
    private val telemetry: Telemetry,
    private val jobId: String,
    private val surahId: String,
    private val ayahNumber: Int,
    initial: ScoringResultPayload? = null,
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
}
