package com.tilawah.android.features.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tilawah.android.storage.AuthSession
import com.tilawah.android.storage.StoredSession
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
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
 */
class ProfileViewModel(
    private val authSession: AuthSession,
) : ViewModel() {

    val session: StateFlow<StoredSession?> = authSession.sessionFlow()
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    val reactivationNotice: StateFlow<Boolean> = authSession.reactivationNotice()
        .stateIn(viewModelScope, SharingStarted.Eagerly, false)

    fun signOut() {
        viewModelScope.launch { authSession.clear() }
    }

    fun acknowledgeReactivationNotice() {
        viewModelScope.launch { authSession.acknowledgeReactivationNotice() }
    }
}
