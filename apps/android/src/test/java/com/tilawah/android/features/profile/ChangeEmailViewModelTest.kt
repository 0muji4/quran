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
import org.junit.Assert.assertNull
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ChangeEmailViewModelTest {

    private val dispatcher = UnconfinedTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun makeUser(
        email: String = "noor@example.com",
    ) = AuthUser(
        id = "u-1",
        email = email,
        displayName = "Noor",
        createdAt = null,
        level = "beginner",
    )

    private suspend fun newSession(user: AuthUser): InMemoryAuthSession {
        val session = InMemoryAuthSession()
        session.save(AuthSessionPayload(accessToken = "a", refreshToken = "r", user = user))
        return session
    }

    @Test
    fun `initial state is idle with empty fields`() = runTest {
        val viewModel = ChangeEmailViewModel(
            currentEmail = "noor@example.com",
            profileService = MockProfileService(),
            authSession = newSession(makeUser()),
        )

        val state = viewModel.state.value
        assertEquals("", state.currentPassword)
        assertEquals("", state.newEmail)
        assertEquals(ChangeEmailStatus.Idle, state.status)
        assertFalse(viewModel.canSubmit())
    }

    @Test
    fun `preflight rejects empty current password`() = runTest {
        val viewModel = ChangeEmailViewModel(
            currentEmail = "noor@example.com",
            profileService = MockProfileService(),
            authSession = newSession(makeUser()),
        )

        viewModel.setNewEmail("new@example.com")
        assertNotNull(viewModel.preflightError())
        assertFalse(viewModel.canSubmit())
    }

    @Test
    fun `preflight rejects empty new email`() = runTest {
        val viewModel = ChangeEmailViewModel(
            currentEmail = "noor@example.com",
            profileService = MockProfileService(),
            authSession = newSession(makeUser()),
        )

        viewModel.setCurrentPassword("password")
        assertNotNull(viewModel.preflightError())
        assertFalse(viewModel.canSubmit())
    }

    @Test
    fun `preflight rejects malformed email`() = runTest {
        val viewModel = ChangeEmailViewModel(
            currentEmail = "noor@example.com",
            profileService = MockProfileService(),
            authSession = newSession(makeUser()),
        )

        viewModel.setCurrentPassword("password")
        viewModel.setNewEmail("not-an-email")
        assertNotNull(viewModel.preflightError())
        assertFalse(viewModel.canSubmit())
    }

    @Test
    fun `preflight rejects same address case-insensitive`() = runTest {
        val viewModel = ChangeEmailViewModel(
            currentEmail = "noor@example.com",
            profileService = MockProfileService(),
            authSession = newSession(makeUser()),
        )

        viewModel.setCurrentPassword("password")
        viewModel.setNewEmail("Noor@Example.com")
        assertNotNull(viewModel.preflightError())
        assertFalse(viewModel.canSubmit())
    }

    @Test
    fun `preflight passes for distinct valid email and password`() = runTest {
        val viewModel = ChangeEmailViewModel(
            currentEmail = "noor@example.com",
            profileService = MockProfileService(),
            authSession = newSession(makeUser()),
        )

        viewModel.setCurrentPassword("password")
        viewModel.setNewEmail("new@example.com")
        assertNull(viewModel.preflightError())
        assertTrue(viewModel.canSubmit())
    }

    @Test
    fun `submit success updates session with refreshed email`() = runTest {
        val refreshed = makeUser(email = "new@example.com")
        val service = MockProfileService(
            updateEmailResult = { _, _ -> Result.success(refreshed) },
        )
        val session = newSession(makeUser(email = "noor@example.com"))
        val viewModel = ChangeEmailViewModel(
            currentEmail = "noor@example.com",
            profileService = service,
            authSession = session,
        )
        viewModel.setCurrentPassword("password")
        viewModel.setNewEmail("new@example.com")

        var dismissed = false
        viewModel.submit(onSuccess = { dismissed = true })
        advanceUntilIdle()

        assertTrue(dismissed)
        assertEquals(ChangeEmailStatus.Idle, viewModel.state.value.status)
        assertEquals("new@example.com", session.sessionFlow().first()?.user?.email)
        assertTrue(service.callLog.any { it == "updateEmail(new@example.com)" })
    }

    @Test
    fun `submit trims new email before sending`() = runTest {
        val refreshed = makeUser(email = "new@example.com")
        val service = MockProfileService(
            updateEmailResult = { _, _ -> Result.success(refreshed) },
        )
        val viewModel = ChangeEmailViewModel(
            currentEmail = "noor@example.com",
            profileService = service,
            authSession = newSession(makeUser()),
        )
        viewModel.setCurrentPassword("password")
        viewModel.setNewEmail("  new@example.com  ")

        viewModel.submit(onSuccess = {})
        advanceUntilIdle()

        assertTrue(service.callLog.any { it == "updateEmail(new@example.com)" })
    }

    @Test
    fun `submit failure with InvalidCredentials surfaces wrong-password copy`() = runTest {
        val service = MockProfileService(
            updateEmailResult = { _, _ -> Result.failure(AppError.InvalidCredentials) },
        )
        val viewModel = ChangeEmailViewModel(
            currentEmail = "noor@example.com",
            profileService = service,
            authSession = newSession(makeUser()),
        )
        viewModel.setCurrentPassword("wrong-pass")
        viewModel.setNewEmail("new@example.com")

        var dismissed = false
        viewModel.submit(onSuccess = { dismissed = true })
        advanceUntilIdle()

        assertFalse(dismissed)
        val status = viewModel.state.value.status
        assertTrue(status is ChangeEmailStatus.Error)
        assertTrue(
            "expected wrong-password copy, got ${(status as ChangeEmailStatus.Error).message}",
            status.message.contains("Current password", ignoreCase = true),
        )
    }

    @Test
    fun `submit failure with EmailInUse surfaces collision copy`() = runTest {
        val service = MockProfileService(
            updateEmailResult = { _, _ -> Result.failure(AppError.EmailInUse) },
        )
        val viewModel = ChangeEmailViewModel(
            currentEmail = "noor@example.com",
            profileService = service,
            authSession = newSession(makeUser()),
        )
        viewModel.setCurrentPassword("password")
        viewModel.setNewEmail("taken@example.com")

        viewModel.submit(onSuccess = {})
        advanceUntilIdle()

        val status = viewModel.state.value.status
        assertTrue(status is ChangeEmailStatus.Error)
        assertTrue((status as ChangeEmailStatus.Error).message.contains("exists", ignoreCase = true))
    }

    @Test
    fun `submit failure with Network surfaces network copy`() = runTest {
        val service = MockProfileService(
            updateEmailResult = { _, _ -> Result.failure(AppError.Network(IllegalStateException("offline"))) },
        )
        val viewModel = ChangeEmailViewModel(
            currentEmail = "noor@example.com",
            profileService = service,
            authSession = newSession(makeUser()),
        )
        viewModel.setCurrentPassword("password")
        viewModel.setNewEmail("new@example.com")

        viewModel.submit(onSuccess = {})
        advanceUntilIdle()

        val status = viewModel.state.value.status
        assertTrue(status is ChangeEmailStatus.Error)
        assertTrue((status as ChangeEmailStatus.Error).message.contains("Network", ignoreCase = true))
    }

    @Test
    fun `editing a field clears prior error`() = runTest {
        val service = MockProfileService(
            updateEmailResult = { _, _ -> Result.failure(AppError.InvalidCredentials) },
        )
        val viewModel = ChangeEmailViewModel(
            currentEmail = "noor@example.com",
            profileService = service,
            authSession = newSession(makeUser()),
        )
        viewModel.setCurrentPassword("wrong-pass")
        viewModel.setNewEmail("new@example.com")
        viewModel.submit(onSuccess = {})
        advanceUntilIdle()
        assertTrue(viewModel.state.value.status is ChangeEmailStatus.Error)

        viewModel.setCurrentPassword("wrong-pass-2")
        assertEquals(ChangeEmailStatus.Idle, viewModel.state.value.status)
    }

    @Test
    fun `clearError resets to idle`() = runTest {
        val service = MockProfileService(
            updateEmailResult = { _, _ -> Result.failure(AppError.InvalidCredentials) },
        )
        val viewModel = ChangeEmailViewModel(
            currentEmail = "noor@example.com",
            profileService = service,
            authSession = newSession(makeUser()),
        )
        viewModel.setCurrentPassword("wrong-pass")
        viewModel.setNewEmail("new@example.com")
        viewModel.submit(onSuccess = {})
        advanceUntilIdle()

        viewModel.clearError()
        assertEquals(ChangeEmailStatus.Idle, viewModel.state.value.status)
    }

    @Test
    fun `submit surfaces validation error and skips the network when preflight fails`() = runTest {
        val service = MockProfileService()
        val viewModel = ChangeEmailViewModel(
            currentEmail = "noor@example.com",
            profileService = service,
            authSession = newSession(makeUser()),
        )
        // No password set → preflight fails.
        viewModel.setNewEmail("new@example.com")

        var dismissed = false
        viewModel.submit(onSuccess = { dismissed = true })
        advanceUntilIdle()

        assertFalse(dismissed)
        assertTrue(viewModel.state.value.status is ChangeEmailStatus.Error)
        assertTrue(service.callLog.isEmpty())
    }
}
