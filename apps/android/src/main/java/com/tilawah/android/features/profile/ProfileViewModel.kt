package com.tilawah.android.features.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelStore
import androidx.lifecycle.ViewModelStoreOwner
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
 * Also owns which account sheet is open ([activeSheet]) and that sheet's
 * ViewModels ([sheetViewModels]), which hold the typed input. Both live
 * here rather than in the composition so they share one lifetime: a
 * rotation keeps both, closing the sheet ends both, and a save that
 * finishes after a rotation still dismisses the sheet on screen, because
 * its callback reaches this same instance.
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

    /**
     * Owner for the open sheet's ViewModels. The Activity's store only
     * clears when the Activity finishes, which would keep a closed
     * sheet's draft, passwords included, and show it on the next open.
     * This store is retained across a rotation and cleared when the
     * sheet closes, which also cancels any save still running in it.
     */
    val sheetViewModels: ViewModelStoreOwner = object : ViewModelStoreOwner {
        override val viewModelStore = ViewModelStore()
    }

    init {
        // Drop an open sheet if the session disappears under us
        // (sign-out from another path, token eviction, etc.).
        viewModelScope.launch {
            session.collect { if (it == null) dismissSheet() }
        }
    }

    fun showSheet(sheet: ProfileSheet) {
        // One sheet at a time: clearing below would pull the ViewModel
        // out from under a sheet that is still on screen.
        if (_activeSheet.value != null) return
        // Composition hears about a dismiss one dispatch late, so a last
        // frame of the closing sheet can re-create its ViewModel.
        sheetViewModels.viewModelStore.clear()
        _activeSheet.value = sheet
    }

    fun dismissSheet() {
        _activeSheet.value = null
        sheetViewModels.viewModelStore.clear()
    }

    fun signOut() {
        viewModelScope.launch { authSession.clear() }
    }

    fun acknowledgeReactivationNotice() {
        viewModelScope.launch { authSession.acknowledgeReactivationNotice() }
    }

    override fun onCleared() {
        sheetViewModels.viewModelStore.clear()
    }
}

/**
 * The account sheet shown over the Profile tab. [EditProfile] and
 * [ChangeEmail] carry the values read when the sheet opened. They seed
 * the sheet's ViewModel and stay put if the session updates mid-save.
 */
sealed interface ProfileSheet {
    data class EditProfile(val user: AuthUser) : ProfileSheet
    data class ChangeEmail(val currentEmail: String) : ProfileSheet
    data object UpdatePassword : ProfileSheet
    data object DeleteAccount : ProfileSheet
}
