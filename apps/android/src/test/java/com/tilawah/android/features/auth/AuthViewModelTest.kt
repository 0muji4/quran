package com.tilawah.android.features.auth

import com.tilawah.android.app.AppError
import com.tilawah.android.backend.AuthApi
import com.tilawah.android.backend.AuthSessionPayload
import com.tilawah.android.backend.AuthUser
import com.tilawah.android.backend.RefreshedTokens
import com.tilawah.android.storage.AuthSession
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
        // The API receives the trimmed email.
        assertEquals("noor@example.com", api.lastSignInEmail)
    }

    @Test
    fun `signIn success resets the form before signalling success`() = runTest {
        val api = FakeAuthApi(signInResult = { _, _ -> payload() })
        val viewModel = AuthViewModel(authApi = api, authSession = InMemoryAuthSession())
        viewModel.fillForm()

        var stateAtSuccess: AuthUiState? = null
        viewModel.signInInternal { stateAtSuccess = viewModel.state.value }

        assertEquals(AuthUiState(), stateAtSuccess)
        assertEquals(AuthUiState(), viewModel.state.value)
    }

    @Test
    fun `signIn works again on the reset form after a sign-out`() = runTest {
        val api = FakeAuthApi(signInResult = { _, _ -> payload() })
        val session = InMemoryAuthSession()
        val viewModel = AuthViewModel(authApi = api, authSession = session)
        viewModel.fillForm()
        viewModel.signInInternal { }
        session.clear()

        viewModel.setEmail("second@example.com")
        viewModel.setPassword("second-password")
        var success = false
        viewModel.signInInternal { success = true }

        assertTrue(success)
        assertEquals("second@example.com", api.lastSignInEmail)
        assertEquals("second-password", api.lastSignInPassword)
    }

    @Test
    fun `signIn failure keeps the typed input and shows the error`() = runTest {
        val api = FakeAuthApi(signInResult = { _, _ -> throw AppError.InvalidCredentials })
        val viewModel = AuthViewModel(authApi = api, authSession = InMemoryAuthSession())
        viewModel.fillForm()
        val typed = viewModel.state.value

        viewModel.signInInternal { }

        assertEquals(typed.copy(error = AppError.InvalidCredentials), viewModel.state.value)
    }

    @Test
    fun `signIn keeps the typed input when the session cannot be saved`() = runTest {
        val api = FakeAuthApi(signInResult = { _, _ -> payload() })
        val viewModel = AuthViewModel(authApi = api, authSession = FailingSaveAuthSession())
        viewModel.fillForm()
        val typed = viewModel.state.value

        var success = false
        viewModel.signInInternal { success = true }

        assertFalse(success)
        assertEquals(typed.copy(error = AppError.StorageUnavailable), viewModel.state.value)
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
    fun `signInWithGoogle success resets a partly typed form`() = runTest {
        val api = FakeAuthApi(googleResult = { _ -> payload() })
        val viewModel = AuthViewModel(authApi = api, authSession = InMemoryAuthSession())
        viewModel.fillForm()

        var stateAtSuccess: AuthUiState? = null
        viewModel.signInWithGoogleInternal(
            getIdToken = { "id-token" },
            onSuccess = { stateAtSuccess = viewModel.state.value },
        )

        assertEquals(AuthUiState(), stateAtSuccess)
        assertEquals(AuthUiState(), viewModel.state.value)
    }

    @Test
    fun `signInWithGoogle cancellation keeps the typed input`() = runTest {
        val api = FakeAuthApi(googleResult = { _ -> error("should not be called") })
        val viewModel = AuthViewModel(authApi = api, authSession = InMemoryAuthSession())
        viewModel.fillForm()
        val typed = viewModel.state.value

        viewModel.signInWithGoogleInternal(getIdToken = { null }, onSuccess = { })

        assertEquals(typed, viewModel.state.value)
    }

    @Test
    fun `signInWithGoogle failure keeps the typed input and shows the error`() = runTest {
        val api = FakeAuthApi(googleResult = { _ -> throw AppError.GoogleLinkRequired })
        val viewModel = AuthViewModel(authApi = api, authSession = InMemoryAuthSession())
        viewModel.fillForm()
        val typed = viewModel.state.value

        viewModel.signInWithGoogleInternal(getIdToken = { "id-token" }, onSuccess = { })

        assertEquals(typed.copy(error = AppError.GoogleLinkRequired), viewModel.state.value)
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
    fun `signUp success resets the form before signalling success`() = runTest {
        val api = FakeAuthApi(signUpResult = { _, _, _ -> payload() })
        val viewModel = AuthViewModel(authApi = api, authSession = InMemoryAuthSession())
        viewModel.fillForm()

        var stateAtSuccess: AuthUiState? = null
        viewModel.signUpInternal { stateAtSuccess = viewModel.state.value }

        assertEquals(AuthUiState(), stateAtSuccess)
        assertEquals(AuthUiState(), viewModel.state.value)
    }

    @Test
    fun `signUp failure keeps the typed input and shows the error`() = runTest {
        val api = FakeAuthApi(signUpResult = { _, _, _ -> throw AppError.EmailInUse })
        val viewModel = AuthViewModel(authApi = api, authSession = InMemoryAuthSession())
        viewModel.fillForm()
        val typed = viewModel.state.value

        viewModel.signUpInternal { }

        assertEquals(typed.copy(error = AppError.EmailInUse), viewModel.state.value)
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
    fun `signUp sends the selected level`() = runTest {
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

        assertEquals("noor@example.com", api.lastSignUpEmail)
        assertEquals("Noor", api.lastSignUpDisplayName)
        assertEquals("intermediate", api.lastSignUpLevel)
    }

    private fun payload() = AuthSessionPayload(
        accessToken = "a",
        refreshToken = "r",
        user = AuthUser("u-1", "noor@example.com", "Noor"),
    )

    /** Sets every field away from its default, as a user would on the sign-up form. */
    private fun AuthViewModel.fillForm() {
        setEmail("noor@example.com")
        setPassword("correct-horse")
        setDisplayName("Noor")
        setLevel(Level.Advanced)
        setAgreedToTerms(true)
    }

    private class FailingSaveAuthSession : AuthSession by InMemoryAuthSession() {
        override suspend fun save(payload: AuthSessionPayload) {
            throw AppError.StorageUnavailable
        }
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
        var lastSignInPassword: String? = null
        var lastSignUpEmail: String? = null
        var lastSignUpDisplayName: String? = null
        var lastSignUpLevel: String? = null
        var lastGoogleIdToken: String? = null

        override suspend fun signIn(email: String, password: String): AuthSessionPayload {
            lastSignInEmail = email
            lastSignInPassword = password
            return signInResult(email, password)
        }

        override suspend fun signUp(
            email: String,
            password: String,
            displayName: String?,
            level: String?,
        ): AuthSessionPayload {
            lastSignUpEmail = email
            lastSignUpDisplayName = displayName
            lastSignUpLevel = level
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
