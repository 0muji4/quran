package com.tilawah.android.features.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tilawah.android.backend.AuthUser
import com.tilawah.android.features.history.computeStats
import com.tilawah.android.storage.AuthSession
import com.tilawah.android.storage.HistoryStore
import com.tilawah.android.storage.StoredSession
import java.time.Instant
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * State container for the Profile tab. Surfaces the current signed-in
 * user (or `null`) by collecting [AuthSession.sessionFlow] into a
 * `StateFlow`, and exposes a single `signOut()` action that delegates
 * back to the session store.
 *
 * The tab UI flips between signed-out (Sign in / Create an account
 * buttons) and signed-in (display name / email / Sign out) purely from
 * this flow — no extra `mutableStateOf` flags or navigation state.
 *
 * Also owns which account sheet is open ([activeSheet]). The flag lives
 * here rather than in the composition so it shares the lifetime of the
 * sheet ViewModels that hold the typed input: a rotation keeps both,
 * and a save that finishes after a rotation still dismisses the sheet
 * on screen, because its callback reaches this same instance.
 */
class ProfileViewModel(
    private val authSession: AuthSession,
    historyStore: HistoryStore,
) : ViewModel() {

    val session: StateFlow<StoredSession?> = authSession.sessionFlow()
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    val streakDays: StateFlow<Int> = historyStore.recentAttempts()
        .map { computeStats(it, Instant.now()).streakDays }
        .stateIn(viewModelScope, SharingStarted.Eagerly, 0)

    val reactivationNotice: StateFlow<Boolean> = authSession.reactivationNotice()
        .stateIn(viewModelScope, SharingStarted.Eagerly, false)

    private val _activeSheet = MutableStateFlow<ProfileSheet?>(null)
    val activeSheet: StateFlow<ProfileSheet?> = _activeSheet.asStateFlow()

    init {
        // Drop an open sheet if the session disappears under us
        // (sign-out from another path, token eviction, etc.).
        viewModelScope.launch {
            session.collect { if (it == null) _activeSheet.value = null }
        }
    }

    fun showSheet(sheet: ProfileSheet) {
        _activeSheet.value = sheet
    }

    fun dismissSheet() {
        _activeSheet.value = null
    }

    fun signOut() {
        viewModelScope.launch { authSession.clear() }
    }

    fun acknowledgeReactivationNotice() {
        viewModelScope.launch { authSession.acknowledgeReactivationNotice() }
    }
}

/**
 * The account sheet shown over the Profile tab. [EditProfile] and
 * [ChangeEmail] carry the values read when the sheet opened, so a
 * session update mid-save doesn't change the sheet's ViewModel key.
 */
sealed interface ProfileSheet {
    data class EditProfile(val user: AuthUser) : ProfileSheet
    data class ChangeEmail(val currentEmail: String) : ProfileSheet
    data object UpdatePassword : ProfileSheet
    data object DeleteAccount : ProfileSheet
}
