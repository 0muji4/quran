package tv.every.tilawah.android.features.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.every.tilawah.android.app.AppError
import tv.every.tilawah.android.backend.QuranBackend
import tv.every.tilawah.android.backend.SurahSummary
import tv.every.tilawah.android.telemetry.Telemetry
import tv.every.tilawah.android.telemetry.TelemetryAttribute
import tv.every.tilawah.android.telemetry.TelemetryEvent

/**
 * Library tab state container. Loads surahs via [QuranBackend.surahs]
 * inside a `Telemetry.measure("library.fetch")` region so the dashboard
 * sees `library.fetch.succeeded` / `.failed` events with `duration_ms`.
 *
 * Mirrors `apps/ios/.../Features/Library/LibraryViewModel.swift`.
 * Search query, chip filter, and Continue card behaviour land in
 * PRs 10 + 11.
 */
class LibraryViewModel(
    private val backend: QuranBackend,
    private val telemetry: Telemetry,
) : ViewModel() {

    private val _state = MutableStateFlow<LibraryUiState>(LibraryUiState.Idle)
    val state: StateFlow<LibraryUiState> = _state.asStateFlow()

    fun load() {
        viewModelScope.launch { loadInternal() }
    }

    /** Suspending helper exposed for unit tests. */
    suspend fun loadInternal() {
        _state.value = LibraryUiState.Loading
        try {
            val surahs: List<SurahSummary> = telemetry.measure("library.fetch") {
                backend.surahs()
            }
            _state.value = LibraryUiState.Loaded(surahs)
        } catch (cause: AppError) {
            telemetry.error(cause, mapOf("screen" to "library"))
            _state.value = LibraryUiState.Failed(cause)
        }
    }

    fun surahOpened(surah: SurahSummary) {
        telemetry.event(
            TelemetryEvent.LIBRARY_SURAH_OPENED,
            mapOf(TelemetryAttribute.SURAH_ID to surah.id),
        )
    }
}
