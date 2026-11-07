package com.tilawah.android.storage

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.emptyPreferences
import com.tilawah.android.backend.AuthSessionPayload
import com.tilawah.android.backend.AuthUser
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DataStoreAuthSessionTest {

    /** Lands each write, then waits on [afterWrite] before returning to the caller. */
    private class FakeDataStore : DataStore<Preferences> {
        private val current = MutableStateFlow(emptyPreferences())
        var afterWrite: CompletableDeferred<Unit>? = null

        override val data: Flow<Preferences> = current

        override suspend fun updateData(
            transform: suspend (t: Preferences) -> Preferences,
        ): Preferences {
            val next = transform(current.value)
            current.value = next
            afterWrite?.await()
            return next
        }
    }

    /**
     * Closing a sheet cancels its scope, and losing the session closes
     * the sheet. A `clear` running in that scope, from Delete account or
     * from an expired token, can be cancelled once the write lands.
     */
    @Test
    fun `clear resets the notice when cancelled after the write lands`() = runTest {
        val store = FakeDataStore()
        val session = DataStoreAuthSession(store)
        session.save(
            AuthSessionPayload(
                accessToken = "a",
                refreshToken = "r",
                user = AuthUser(id = "u-1", email = "noor@example.com", displayName = "Noor"),
                reactivated = true,
            ),
        )
        assertTrue(session.reactivationNotice().first())
        store.afterWrite = CompletableDeferred()

        val clearing = launch { session.clear() }
        runCurrent()
        assertNull(session.sessionFlow().first())
        clearing.cancelAndJoin()

        assertFalse(session.reactivationNotice().first())
    }
}
