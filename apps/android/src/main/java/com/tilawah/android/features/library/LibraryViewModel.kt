package com.tilawah.android.features.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlin.math.roundToInt
import com.tilawah.android.app.AppError
import com.tilawah.android.backend.QuranBackend
import com.tilawah.android.backend.SuggestionClient
import com.tilawah.android.backend.SurahSuggestion
import com.tilawah.android.backend.SurahSummary
import com.tilawah.android.storage.HistoryStore
import com.tilawah.android.storage.LastPracticed
import com.tilawah.android.telemetry.Telemetry
import com.tilawah.android.telemetry.TelemetryAttribute
import com.tilawah.android.telemetry.TelemetryEvent

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
    private val historyStore: HistoryStore? = null,
    private val suggestionClient: SuggestionClient? = null,
    private val isSignedIn: () -> Boolean = { false },
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

    private val _suggestion = MutableStateFlow<SurahSuggestion?>(null)
    val suggestion: StateFlow<SurahSuggestion?> = _suggestion.asStateFlow()

    /**
     * Best score per surah on a 0–100 scale, keyed by `surahId`. Drives
     * the "best NN" suffix in [SurahRow]'s metadata. Snapshotted once per
     * [load] (rather than collecting N flows reactively) because the
     * library list is static while visible and re-loads on tab re-entry;
     * a per-surah `StateFlow` fan-out would cost 114 collectors for a
     * value that changes only after a practice session ends elsewhere.
     */
    private val _bestScores = MutableStateFlow<Map<String, Int>>(emptyMap())
    val bestScores: StateFlow<Map<String, Int>> = _bestScores.asStateFlow()

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
            loadBestScores(surahs)
            loadSuggestion()
        } catch (cause: AppError) {
            telemetry.error(cause, mapOf("screen" to "library"))
            _state.value = LibraryUiState.Failed(cause)
        }
    }

    /**
     * Snapshot the best score for each loaded surah into [bestScores].
     * No-op when there is no [historyStore] (anonymous / preview), which
     * leaves the map empty so [SurahRow] simply omits the "best" suffix.
     */
    private suspend fun loadBestScores(surahs: List<SurahSummary>) {
        val store = historyStore ?: return
        _bestScores.value = surahs.mapNotNull { surah ->
            store.bestScoreForSurah(surah.id).first()
                ?.let { surah.id to (it * 100).roundToInt() }
        }.toMap()
    }

    /**
     * Pull a fresh personalised suggestion for the signed-in user.
     * Anonymous users get null — the BFF requires auth, and the card
     * stays hidden rather than leak a guest-flavoured surface. Errors
     * surface to telemetry and leave the suggestion null so the view
     * just hides the card.
     */
    private suspend fun loadSuggestion() {
        if (suggestionClient == null || !isSignedIn()) {
            _suggestion.value = null
            return
        }
        try {
            _suggestion.value = telemetry.measure("library.suggestion") {
                suggestionClient.suggestions()
            }
        } catch (cause: AppError) {
            telemetry.error(cause, mapOf("screen" to "library.suggestion"))
            _suggestion.value = null
        }
    }

    fun suggestedTapped(surah: SurahSummary, reason: String) {
        telemetry.event(
            TelemetryEvent.LIBRARY_SUGGESTED_TAPPED,
            mapOf(
                TelemetryAttribute.SURAH_ID to surah.id,
                TelemetryAttribute.SUGGESTION_REASON to reason,
            ),
        )
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
