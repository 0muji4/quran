package com.tilawah.android.features.library

import com.tilawah.android.app.AppError
import com.tilawah.android.backend.SurahSummary

/**
 * Visible state for the Library tab. Mirrors iOS's
 * `LibraryViewModel.LoadState` enum (ADR 0005) so a future test
 * harness shared with iOS can reuse the case names.
 */
sealed interface LibraryUiState {
    data object Idle : LibraryUiState
    data object Loading : LibraryUiState
    data class Loaded(val surahs: List<SurahSummary>) : LibraryUiState
    data class Failed(val error: AppError) : LibraryUiState
}
