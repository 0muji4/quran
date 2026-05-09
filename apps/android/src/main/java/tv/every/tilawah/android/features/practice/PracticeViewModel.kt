package tv.every.tilawah.android.features.practice

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.every.tilawah.android.app.AppError
import tv.every.tilawah.android.audio.Player
import tv.every.tilawah.android.audio.Recorder
import tv.every.tilawah.android.backend.AyahDetail
import tv.every.tilawah.android.backend.QuranBackend
import tv.every.tilawah.android.storage.HistoryStore
import tv.every.tilawah.android.telemetry.Telemetry
import tv.every.tilawah.android.telemetry.TelemetryAttribute
import tv.every.tilawah.android.telemetry.TelemetryEvent

/**
 * Practice tab state container. Mirrors
 * `apps/ios/.../Features/Practice/PracticeViewModel.swift`. Recording
 * + scoring transitions arrive in PRs 14–16.
 */
class PracticeViewModel(
    private val backend: QuranBackend,
    private val recorder: Recorder,
    val player: Player,
    private val historyStore: HistoryStore,
    private val telemetry: Telemetry,
    private val surahId: String,
    private val ayahNumber: Int,
) : ViewModel() {

    private val _state = MutableStateFlow<PracticeState>(PracticeState.Idle)
    val state: StateFlow<PracticeState> = _state.asStateFlow()

    private val _ayah = MutableStateFlow<AyahDetail?>(null)
    val ayah: StateFlow<AyahDetail?> = _ayah.asStateFlow()

    private val _reference = MutableStateFlow<TeacherReferenceState>(TeacherReferenceState.Loading)
    val reference: StateFlow<TeacherReferenceState> = _reference.asStateFlow()

    private var referencePlayedOnce: Boolean = false

    init {
        viewModelScope.launch { loadAyah() }
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

    private fun refreshReferenceFromPlayer() {
        if (_reference.value is TeacherReferenceState.Ready) {
            _reference.value = TeacherReferenceState.Ready(player.state.value)
        }
    }

    override fun onCleared() {
        player.release()
        super.onCleared()
    }
}
