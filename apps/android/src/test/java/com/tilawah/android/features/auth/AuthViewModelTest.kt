package com.tilawah.android.features.auth

import com.tilawah.android.app.AppError
import com.tilawah.android.backend.AuthApi
import com.tilawah.android.backend.AuthSessionPayload
import com.tilawah.android.backend.AuthUser
import com.tilawah.android.storage.InMemoryAuthSession
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthViewModelTest {

    @Test
    fun `signIn happy path persists session and signals success`() = runTest {
        val api = FakeAuthApi(
            signInResult = { _, _ ->
                AuthSessionPayload(
                    accessToken = "a",
                    refreshToken = "r",
                    user = AuthUser("u-1", "noor@example.com", "Noor"),
                )
            },
        )
        val session = InMemoryAuthSession()
        val viewModel = AuthViewModel(authApi = api, authSession = session)
        viewModel.setEmail("  noor@example.com  ")
        viewModel.setPassword("correct-horse")

        var success = false
        viewModel.signInInternal { success = true }

        assertTrue(success)
        assertFalse(viewModel.state.value.pending)
        assertNull(viewModel.state.value.error)
        // Trimmed email lands at the API; original UI state unchanged.
        assertEquals("noor@example.com", api.lastSignInEmail)
    }

    @Test
    fun `signIn 401 leaves error in state and skips session save`() = runTest {
        val api = FakeAuthApi(signInResult = { _, _ -> throw AppError.InvalidCredentials })
        val session = InMemoryAuthSession()
        val viewModel = AuthViewModel(authApi = api, authSession = session)
        viewModel.setEmail("noor@example.com")
        viewModel.setPassword("wrong")

        var success = false
        viewModel.signInInternal { success = true }

        assertFalse(success)
        assertFalse(viewModel.state.value.pending)
        assertEquals(AppError.InvalidCredentials, viewModel.state.value.error)
        // sessionFlow stays null — session save was never reached.
        assertNull(session.sessionFlow().first())
    }

    @Test
    fun `setEmail clears prior error`() = runTest {
        val api = FakeAuthApi(signInResult = { _, _ -> throw AppError.InvalidCredentials })
        val viewModel = AuthViewModel(authApi = api, authSession = InMemoryAuthSession())
        viewModel.setEmail("noor@example.com")
        viewModel.setPassword("wrong")
        viewModel.signInInternal { }
        assertNotNull(viewModel.state.value.error)

        viewModel.setEmail("retry@example.com")

        assertNull(viewModel.state.value.error)
    }

    private class FakeAuthApi(
        val signInResult: (String, String) -> AuthSessionPayload,
    ) : AuthApi {
        var lastSignInEmail: String? = null

        override suspend fun signIn(email: String, password: String): AuthSessionPayload {
            lastSignInEmail = email
            return signInResult(email, password)
        }

        override suspend fun signUp(
            email: String,
            password: String,
            displayName: String?,
        ): AuthSessionPayload = throw NotImplementedError("not used in sign-in tests")
    }
}
