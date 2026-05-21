package com.tilawah.android.storage

import com.tilawah.android.backend.AuthSessionPayload
import com.tilawah.android.backend.AuthUser
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Verifies the reactivation notice contract on [AuthSession]
 * implementations: a payload with `reactivated = true` flips the flag
 * on; [AuthSession.acknowledgeReactivationNotice] and [AuthSession.clear]
 * flip it back off; a normal sign-in must not clear a still-pending
 * notice from a prior reactivating sign-in.
 */
class AuthSessionReactivationTest {

    private fun user() = AuthUser(
        id = "u-1",
        email = "noor@example.com",
        displayName = "Noor",
    )

    @Test
    fun `notice starts false`() = runTest {
        val session = InMemoryAuthSession()
        assertFalse(session.reactivationNotice().first())
    }

    @Test
    fun `save with reactivated true sets the notice`() = runTest {
        val session = InMemoryAuthSession()
        session.save(
            AuthSessionPayload(
                accessToken = "a", refreshToken = "r", user = user(), reactivated = true,
            ),
        )
        assertTrue(session.reactivationNotice().first())
    }

    @Test
    fun `save with reactivated false does not set the notice`() = runTest {
        val session = InMemoryAuthSession()
        session.save(AuthSessionPayload(accessToken = "a", refreshToken = "r", user = user()))
        assertFalse(session.reactivationNotice().first())
    }

    @Test
    fun `acknowledge clears the notice`() = runTest {
        val session = InMemoryAuthSession()
        session.save(
            AuthSessionPayload(
                accessToken = "a", refreshToken = "r", user = user(), reactivated = true,
            ),
        )

        session.acknowledgeReactivationNotice()
        assertFalse(session.reactivationNotice().first())
    }

    @Test
    fun `non-reactivating save preserves a still-pending notice`() = runTest {
        val session = InMemoryAuthSession()
        session.save(
            AuthSessionPayload(
                accessToken = "a", refreshToken = "r", user = user(), reactivated = true,
            ),
        )
        // A non-reactivating re-save (e.g. token refresh updates) must
        // not clobber a notice that the UI hasn't acknowledged yet.
        session.save(
            AuthSessionPayload(
                accessToken = "a2", refreshToken = "r2", user = user(),
            ),
        )

        assertTrue(session.reactivationNotice().first())
    }

    @Test
    fun `clear drops the notice along with the session`() = runTest {
        val session = InMemoryAuthSession()
        session.save(
            AuthSessionPayload(
                accessToken = "a", refreshToken = "r", user = user(), reactivated = true,
            ),
        )

        session.clear()
        assertFalse(session.reactivationNotice().first())
        assertEquals(null, session.sessionFlow().first())
    }
}
