package com.tilawah.android.features.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tilawah.android.backend.PracticePreferences
import com.tilawah.android.backend.PracticePreferencesPatch
import com.tilawah.android.backend.PreferencesClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Drives the Practice Preferences card with an optimistic-write model:
 * each edit applies locally at once, fires a single-field `PATCH`, and
 * rolls back with an error message if the server rejects it. The server's
 * echo — not the local guess — becomes the source of truth so a
 * server-side normalisation (e.g. `1` → `1.0`) sticks.
 *
 * Mirrors `apps/ios/.../Features/Profile/PreferencesViewModel.swift`.
 */
class PreferencesViewModel(
    private val client: PreferencesClient,
) : ViewModel() {

    private val _state = MutableStateFlow(
        PreferencesUiState(
            preferences = PracticePreferences.Default,
            isLoaded = false,
            errorMessage = null,
        ),
    )
    val state: StateFlow<PreferencesUiState> = _state.asStateFlow()

    /**
     * Loads once per instance. A failed load keeps the defaults rather
     * than blocking the card — "user has no row yet" is the common case
     * and the BFF returns defaults for it, so a transient fetch error
     * degrades to the same place.
     */
    fun load() {
        if (_state.value.isLoaded) return
        viewModelScope.launch {
            val loaded = try {
                client.preferences()
            } catch (_: Throwable) {
                null
            }
            _state.update { it.copy(preferences = loaded ?: it.preferences, isLoaded = true) }
        }
    }

    fun setReciter(id: String) =
        applyEdit(PracticePreferencesPatch(referenceReciterId = id)) { it.copy(referenceReciterId = id) }

    fun setPlaybackSpeed(speed: Double) =
        applyEdit(PracticePreferencesPatch(defaultPlaybackSpeed = speed)) { it.copy(defaultPlaybackSpeed = speed) }

    fun setReminderEnabled(enabled: Boolean) =
        applyEdit(PracticePreferencesPatch(dailyReminderEnabled = enabled)) { it.copy(dailyReminderEnabled = enabled) }

    fun setReminderTime(time: String) =
        applyEdit(PracticePreferencesPatch(dailyReminderTime = time)) { it.copy(dailyReminderTime = time) }

    /**
     * Apply [optimistic] locally, PATCH [patch], and reconcile against the
     * server echo — or roll back to the pre-edit snapshot on failure.
     */
    private fun applyEdit(
        patch: PracticePreferencesPatch,
        optimistic: (PracticePreferences) -> PracticePreferences,
    ) {
        val previous = _state.value.preferences
        _state.update { it.copy(preferences = optimistic(it.preferences), errorMessage = null) }
        viewModelScope.launch {
            try {
                val echoed = client.updatePreferences(patch)
                _state.update { it.copy(preferences = echoed) }
            } catch (_: Throwable) {
                _state.update { it.copy(preferences = previous, errorMessage = SAVE_FAILED_MESSAGE) }
            }
        }
    }

    private companion object {
        const val SAVE_FAILED_MESSAGE = "Couldn't save preference. Try again."
    }
}

/** Snapshot the Practice Preferences card observes. */
data class PreferencesUiState(
    val preferences: PracticePreferences,
    /** Whether the first GET has resolved — gates the loading affordance. */
    val isLoaded: Boolean,
    val errorMessage: String?,
)
