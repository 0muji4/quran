package com.tilawah.android.features.profile

import com.tilawah.android.app.AppError
import com.tilawah.android.backend.AuthSessionPayload
import com.tilawah.android.backend.AuthUser
import com.tilawah.android.backend.MockProfileService
import com.tilawah.android.storage.InMemoryAuthSession
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class DeleteAccountViewModelTest {

    private val dispatcher = UnconfinedTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun makeUser() = AuthUser(
        id = "u-1",
        email = "noor@example.com",
        displayName = "Noor",
        createdAt = null,
        level = "beginner",
    )

    private suspend fun signedInSession(): InMemoryAuthSession {
        val session = InMemoryAuthSession()
        session.save(AuthSessionPayload(accessToken = "a", refreshToken = "r", user = makeUser()))
        return session
    }

    @Test
    fun `initial state is idle with empty confirm text`() = runTest {
        val viewModel = DeleteAccountViewModel(
            profileService = MockProfileService(),
            authSession = signedInSession(),
        )

        val state = viewModel.state.value
        assertEquals("", state.confirmText)
        assertEquals(DeleteAccountStatus.Idle, state.status)
        assertFalse(viewModel.canSubmit())
    }

    @Test
    fun `canSubmit becomes true only when DELETE is typed exactly`() = runTest {
        val viewModel = DeleteAccountViewModel(
            profileService = MockProfileService(),
            authSession = signedInSession(),
        )

        viewModel.setConfirmText("delete")
        assertFalse("lowercase is rejected", viewModel.canSubmit())

        viewModel.setConfirmText("DELETE ")
        assertFalse("trailing whitespace is rejected", viewModel.canSubmit())

        viewModel.setConfirmText("DELETE")
        assertTrue(viewModel.canSubmit())
    }

    @Test
    fun `submit success clears the session`() = runTest {
        val service = MockProfileService(deleteAccountResult = Result.success(Unit))
        val session = signedInSession()
        val viewModel = DeleteAccountViewModel(
            profileService = service,
            authSession = session,
        )
        viewModel.setConfirmText("DELETE")

        var dismissed = false
        viewModel.submit(onSuccess = { dismissed = true })
        advanceUntilIdle()

        assertTrue(dismissed)
        assertEquals(DeleteAccountStatus.Idle, viewModel.state.value.status)
        assertNull(session.sessionFlow().first())
        assertTrue(service.callLog.contains("deleteAccount"))
    }

    @Test
    fun `submit InvalidCredentials surfaces session-expired copy`() = runTest {
        val service = MockProfileService(
            deleteAccountResult = Result.failure(AppError.InvalidCredentials),
        )
        val session = signedInSession()
        val viewModel = DeleteAccountViewModel(
            profileService = service,
            authSession = session,
        )
        viewModel.setConfirmText("DELETE")

        var dismissed = false
        viewModel.submit(onSuccess = { dismissed = true })
        advanceUntilIdle()

        assertFalse(dismissed)
        val status = viewModel.state.value.status
        assertTrue(status is DeleteAccountStatus.Error)
        assertTrue(
            (status as DeleteAccountStatus.Error).message.contains("session", ignoreCase = true),
        )
        // Session was NOT cleared — failure doesn't get to phantom-sign-out.
        assertNotNull(session.sessionFlow().first())
    }

    @Test
    fun `submit Network surfaces network copy`() = runTest {
        val service = MockProfileService(
            deleteAccountResult = Result.failure(AppError.Network(IllegalStateException("offline"))),
        )
        val viewModel = DeleteAccountViewModel(
            profileService = service,
            authSession = signedInSession(),
        )
        viewModel.setConfirmText("DELETE")

        viewModel.submit(onSuccess = {})
        advanceUntilIdle()

        val status = viewModel.state.value.status
        assertTrue(status is DeleteAccountStatus.Error)
        assertTrue((status as DeleteAccountStatus.Error).message.contains("Network", ignoreCase = true))
    }

    @Test
    fun `submit short-circuits when confirmation phrase is wrong`() = runTest {
        val service = MockProfileService()
        val viewModel = DeleteAccountViewModel(
            profileService = service,
            authSession = signedInSession(),
        )
        viewModel.setConfirmText("delete me")

        var dismissed = false
        viewModel.submit(onSuccess = { dismissed = true })
        advanceUntilIdle()

        assertFalse(dismissed)
        assertTrue(viewModel.state.value.status is DeleteAccountStatus.Error)
        assertTrue(service.callLog.isEmpty())
    }

    @Test
    fun `editing the confirm text clears prior error`() = runTest {
        val service = MockProfileService(
            deleteAccountResult = Result.failure(AppError.Network(IllegalStateException("offline"))),
        )
        val viewModel = DeleteAccountViewModel(
            profileService = service,
            authSession = signedInSession(),
        )
        viewModel.setConfirmText("DELETE")
        viewModel.submit(onSuccess = {})
        advanceUntilIdle()
        assertTrue(viewModel.state.value.status is DeleteAccountStatus.Error)

        viewModel.setConfirmText("DELETE")
        assertEquals(DeleteAccountStatus.Idle, viewModel.state.value.status)
    }

    @Test
    fun `confirmation phrase is exposed as a public constant`() {
        // The Sheet body shows the same phrase; the test guards against
        // someone changing one without the other.
        assertEquals("DELETE", DeleteAccountViewModel.CONFIRMATION_PHRASE)
    }
}
