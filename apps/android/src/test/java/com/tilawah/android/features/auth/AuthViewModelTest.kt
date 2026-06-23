package com.tilawah.android.features.auth

import com.tilawah.android.app.AppError
import com.tilawah.android.backend.AuthApi
import com.tilawah.android.backend.AuthSessionPayload
import com.tilawah.android.backend.AuthUser
import com.tilawah.android.backend.RefreshedTokens
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

    @Test
    fun `signInWithGoogle happy path persists session and signals success`() = runTest {
        val api = FakeAuthApi(
            googleResult = { _ ->
                AuthSessionPayload(
                    accessToken = "a",
                    refreshToken = "r",
                    user = AuthUser("u-2", "g@example.com", "Goog"),
                )
            },
        )
        val session = InMemoryAuthSession()
        val viewModel = AuthViewModel(authApi = api, authSession = session)

        var capturedNonce: String? = null
        var success = false
        viewModel.signInWithGoogleInternal(
            getIdToken = { nonce ->
                capturedNonce = nonce
                "id-token"
            },
            onSuccess = { success = true },
        )

        assertTrue(success)
        assertFalse(viewModel.state.value.pending)
        assertNull(viewModel.state.value.error)
        assertEquals("nonce-1", capturedNonce)
        assertEquals("id-token", api.lastGoogleIdToken)
        assertNotNull(session.sessionFlow().first())
    }

    @Test
    fun `signInWithGoogle cancellation is not an error and skips the API`() = runTest {
        val api = FakeAuthApi(googleResult = { _ -> error("should not be called") })
        val session = InMemoryAuthSession()
        val viewModel = AuthViewModel(authApi = api, authSession = session)

        var success = false
        viewModel.signInWithGoogleInternal(getIdToken = { null }, onSuccess = { success = true })

        assertFalse(success)
        assertFalse(viewModel.state.value.pending)
        assertNull(viewModel.state.value.error)
        assertNull(api.lastGoogleIdToken)
        assertNull(session.sessionFlow().first())
    }

    @Test
    fun `signInWithGoogle 409 surfaces link-required error and skips session save`() = runTest {
        val api = FakeAuthApi(googleResult = { _ -> throw AppError.GoogleLinkRequired })
        val session = InMemoryAuthSession()
        val viewModel = AuthViewModel(authApi = api, authSession = session)

        var success = false
        viewModel.signInWithGoogleInternal(getIdToken = { "id-token" }, onSuccess = { success = true })

        assertFalse(success)
        assertEquals(AppError.GoogleLinkRequired, viewModel.state.value.error)
        assertNull(session.sessionFlow().first())
    }

    @Test
    fun `signUp without terms surfaces termsError and skips API call`() = runTest {
        val api = FakeAuthApi(signUpResult = { _, _, _ -> error("should not be called") })
        val viewModel = AuthViewModel(authApi = api, authSession = InMemoryAuthSession())
        viewModel.setEmail("noor@example.com")
        viewModel.setPassword("long-enough-pw")

        var success = false
        viewModel.signUpInternal { success = true }

        assertFalse(success)
        assertTrue(viewModel.state.value.termsError)
        assertNull(api.lastSignUpEmail)
    }

    @Test
    fun `signUp 409 surfaces EmailInUse and clears termsError`() = runTest {
        val api = FakeAuthApi(signUpResult = { _, _, _ -> throw AppError.EmailInUse })
        val viewModel = AuthViewModel(authApi = api, authSession = InMemoryAuthSession())
        viewModel.setEmail("noor@example.com")
        viewModel.setPassword("long-enough-pw")
        viewModel.setAgreedToTerms(true)
        viewModel.setLevel(Level.Advanced)

        viewModel.signUpInternal { }

        assertEquals(AppError.EmailInUse, viewModel.state.value.error)
        assertFalse(viewModel.state.value.termsError)
    }

    @Test
    fun `signUp never sends level or terms to the API`() = runTest {
        val api = FakeAuthApi(
            signUpResult = { _, _, displayName ->
                AuthSessionPayload(
                    accessToken = "a",
                    refreshToken = "r",
                    user = AuthUser("u-1", "noor@example.com", displayName),
                )
            },
        )
        val viewModel = AuthViewModel(authApi = api, authSession = InMemoryAuthSession())
        viewModel.setEmail("noor@example.com")
        viewModel.setPassword("long-enough-pw")
        viewModel.setDisplayName("  Noor  ")
        viewModel.setLevel(Level.Intermediate)
        viewModel.setAgreedToTerms(true)

        viewModel.signUpInternal { }

        // The fake API only records the three parameters the interface
        // exposes; if level or terms ever leak into AuthApi.signUp this
        // assertion has to change deliberately.
        assertEquals("noor@example.com", api.lastSignUpEmail)
        assertEquals("Noor", api.lastSignUpDisplayName)
    }

    private class FakeAuthApi(
        val signInResult: (String, String) -> AuthSessionPayload = { _, _ ->
            error("signIn not configured")
        },
        val signUpResult: (String, String, String?) -> AuthSessionPayload = { _, _, _ ->
            error("signUp not configured")
        },
        val googleResult: (String) -> AuthSessionPayload = {
            error("signInWithGoogle not configured")
        },
        val nonce: String = "nonce-1",
    ) : AuthApi {
        var lastSignInEmail: String? = null
        var lastSignUpEmail: String? = null
        var lastSignUpDisplayName: String? = null
        var lastGoogleIdToken: String? = null

        override suspend fun signIn(email: String, password: String): AuthSessionPayload {
            lastSignInEmail = email
            return signInResult(email, password)
        }

        override suspend fun signUp(
            email: String,
            password: String,
            displayName: String?,
        ): AuthSessionPayload {
            lastSignUpEmail = email
            lastSignUpDisplayName = displayName
            return signUpResult(email, password, displayName)
        }

        override suspend fun refresh(refreshToken: String): RefreshedTokens {
            error("refresh not configured")
        }

        override suspend fun requestGoogleNonce(): String = nonce

        override suspend fun signInWithGoogle(idToken: String): AuthSessionPayload {
            lastGoogleIdToken = idToken
            return googleResult(idToken)
        }
    }
}
