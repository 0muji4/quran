package com.quran.android.features.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import com.quran.android.app.AppError
import com.quran.android.backend.QuranBackend
import com.quran.android.backend.SurahSummary
import com.quran.android.storage.HistoryStore
import com.quran.android.storage.LastPracticed
import com.quran.android.telemetry.Telemetry
import com.quran.android.telemetry.TelemetryAttribute
import com.quran.android.telemetry.TelemetryEvent

/**
 * Library tab state container. Loads surahs via [QuranBackend.surahs]
 * inside a `Telemetry.measure("library.fetch")` region so the dashboard
 * sees `library.fetch.succeeded` / `.failed` events with `duration_ms`.
 *
 * Mirrors `apps/ios/.../Features/Library/LibraryViewModel.swift`.
 */
class LibraryViewModel(
    private val backend: QuranBackend,
    private val telemetry: Telemetry,
    historyStore: HistoryStore? = null,
) : ViewModel() {

    private val _state = MutableStateFlow<LibraryUiState>(LibraryUiState.Idle)
    val state: StateFlow<LibraryUiState> = _state.asStateFlow()

    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query.asStateFlow()

    private val _filter = MutableStateFlow(LibraryFilter.All)
    val filter: StateFlow<LibraryFilter> = _filter.asStateFlow()

    val lastPracticed: StateFlow<LastPracticed?> = historyStore
        ?.lastPracticed()
        ?.stateIn(viewModelScope, SharingStarted.Eagerly, null)
        ?: MutableStateFlow<LastPracticed?>(null).asStateFlow()

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

    fun continueTapped(entry: LastPracticed) {
        telemetry.event(
            TelemetryEvent.LIBRARY_CONTINUE_TAPPED,
            mapOf(
                TelemetryAttribute.SURAH_ID to entry.surahId,
                TelemetryAttribute.AYAH_NUMBER to entry.ayahNumber.toString(),
            ),
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
