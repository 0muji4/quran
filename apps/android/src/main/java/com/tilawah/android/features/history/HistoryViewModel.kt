package com.tilawah.android.features.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import com.tilawah.android.storage.Attempt
import com.tilawah.android.storage.HistoryStore

/**
 * History tab state container. Reads attempts from [HistoryStore] and
 * filters by chip. Mirrors `apps/ios/.../Features/History/HistoryViewModel.swift`.
 */
class HistoryViewModel(
    historyStore: HistoryStore,
) : ViewModel() {

    private val _filter = MutableStateFlow<HistoryFilter>(HistoryFilter.All)
    val filter: StateFlow<HistoryFilter> = _filter.asStateFlow()

    val attempts: StateFlow<List<Attempt>> = historyStore.recentAttempts()
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    val filteredAttempts: StateFlow<List<Attempt>> = combine(attempts, _filter) { items, filter ->
        when (filter) {
            HistoryFilter.All -> items
            is HistoryFilter.Surah -> items.filter { it.surahId == filter.id }
        }
    }.stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    /** Top-5 distinct surahs (most-recent attempt first) for chip rendering. */
    val filterOptions: StateFlow<List<HistoryFilter>> = attempts
        .map { items ->
            val seen = LinkedHashSet<String>()
            val out = mutableListOf<HistoryFilter>(HistoryFilter.All)
            for (attempt in items) {
                if (attempt.surahId !in seen) {
                    seen += attempt.surahId
                    out += HistoryFilter.Surah(attempt.surahId, attempt.surahNameEn)
                    if (out.size >= MAX_OPTIONS) break
                }
            }
            out.toList()
        }
        .stateIn(viewModelScope, SharingStarted.Eagerly, listOf(HistoryFilter.All))

    fun setFilter(value: HistoryFilter) {
        _filter.value = value
    }

    private companion object {
        const val MAX_OPTIONS = 5
    }
}
