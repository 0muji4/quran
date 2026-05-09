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

/**
 * Practice tab state container. PR 12 ships the scaffold only:
 * load the ayah for the supplied (surahId, ayahNumber) and surface
 * the [PracticeState] machine in [Idle][PracticeState.Idle]. Recording
 * + scoring transitions arrive in PRs 13–16.
 *
 * Mirrors `apps/ios/.../Features/Practice/PracticeViewModel.swift`.
 */
class PracticeViewModel(
    private val backend: QuranBackend,
    private val recorder: Recorder,
    private val player: Player,
    private val historyStore: HistoryStore,
    private val telemetry: Telemetry,
    private val surahId: String,
    private val ayahNumber: Int,
) : ViewModel() {

    private val _state = MutableStateFlow<PracticeState>(PracticeState.Idle)
    val state: StateFlow<PracticeState> = _state.asStateFlow()

    private val _ayah = MutableStateFlow<AyahDetail?>(null)
    val ayah: StateFlow<AyahDetail?> = _ayah.asStateFlow()

    init {
        viewModelScope.launch { loadAyah() }
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
}
