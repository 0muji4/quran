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
 * Mirrors `apps/ios/.../Features/Library/LibraryViewModel.swift`. The
 * Continue card behaviour lands in PR 11; navigation in PR 11.
 */
class LibraryViewModel(
    private val backend: QuranBackend,
    private val telemetry: Telemetry,
) : ViewModel() {

    private val _state = MutableStateFlow<LibraryUiState>(LibraryUiState.Idle)
    val state: StateFlow<LibraryUiState> = _state.asStateFlow()

    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query.asStateFlow()

    private val _filter = MutableStateFlow(LibraryFilter.All)
    val filter: StateFlow<LibraryFilter> = _filter.asStateFlow()

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

    fun setQuery(value: String) {
        _query.value = value
    }

    fun setFilter(value: LibraryFilter) {
        _filter.value = value
    }

    fun surahOpened(surah: SurahSummary) {
        telemetry.event(
            TelemetryEvent.LIBRARY_SURAH_OPENED,
            mapOf(TelemetryAttribute.SURAH_ID to surah.id),
        )
    }

    /**
     * Surahs visible to the View after applying the current chip
     * filter and search query. Returns an empty list unless the load
     * state is [LibraryUiState.Loaded]. Search matches both English
     * and Arabic names case-insensitively.
     */
    fun filteredSurahs(): List<SurahSummary> {
        val current = _state.value
        if (current !is LibraryUiState.Loaded) return emptyList()
        val q = _query.value.trim()
        return current.surahs
            .filter { matchesFilter(it, _filter.value) }
            .filter { matchesQuery(it, q) }
    }

    private fun matchesFilter(surah: SurahSummary, filter: LibraryFilter): Boolean = when (filter) {
        LibraryFilter.All -> true
        LibraryFilter.Mecca -> surah.revelationPlace.equals("mecca", ignoreCase = true)
        LibraryFilter.Medina -> surah.revelationPlace.equals("medina", ignoreCase = true)
        LibraryFilter.Short -> surah.ayahCount <= LibraryFilter.SHORT_AYAH_CUTOFF
    }

    private fun matchesQuery(surah: SurahSummary, q: String): Boolean {
        if (q.isEmpty()) return true
        return surah.nameEn.contains(q, ignoreCase = true) ||
            surah.nameAr.contains(q, ignoreCase = true)
    }
}
