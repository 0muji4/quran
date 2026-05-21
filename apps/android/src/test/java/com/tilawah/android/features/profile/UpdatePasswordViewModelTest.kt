package com.tilawah.android.features.profile

import com.tilawah.android.app.AppError
import com.tilawah.android.backend.MockProfileService
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Dispatchers
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
class UpdatePasswordViewModelTest {

    private val dispatcher = UnconfinedTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `initial state is idle with empty fields`() = runTest {
        val viewModel = UpdatePasswordViewModel(profileService = MockProfileService())

        val state = viewModel.state.value
        assertEquals("", state.currentPassword)
        assertEquals("", state.newPassword)
        assertEquals("", state.confirmPassword)
        assertEquals(UpdatePasswordStatus.Idle, state.status)
        assertFalse(viewModel.canSubmit())
    }

    @Test
    fun `preflight rejects empty current password`() = runTest {
        val viewModel = UpdatePasswordViewModel(profileService = MockProfileService())
        viewModel.setNewPassword("new-password-1")
        viewModel.setConfirmPassword("new-password-1")

        assertNotNull(viewModel.preflightError())
        assertFalse(viewModel.canSubmit())
    }

    @Test
    fun `preflight rejects new password under 8 characters`() = runTest {
        val viewModel = UpdatePasswordViewModel(profileService = MockProfileService())
        viewModel.setCurrentPassword("old-password")
        viewModel.setNewPassword("short")
        viewModel.setConfirmPassword("short")

        assertNotNull(viewModel.preflightError())
        assertFalse(viewModel.canSubmit())
    }

    @Test
    fun `preflight rejects mismatched confirmation`() = runTest {
        val viewModel = UpdatePasswordViewModel(profileService = MockProfileService())
        viewModel.setCurrentPassword("old-password")
        viewModel.setNewPassword("new-password-1")
        viewModel.setConfirmPassword("new-password-2")

        assertNotNull(viewModel.preflightError())
    }

    @Test
    fun `preflight rejects identical old and new password`() = runTest {
        val viewModel = UpdatePasswordViewModel(profileService = MockProfileService())
        viewModel.setCurrentPassword("same-password")
        viewModel.setNewPassword("same-password")
        viewModel.setConfirmPassword("same-password")

        assertNotNull(viewModel.preflightError())
    }

    @Test
    fun `preflight passes when all rules satisfied`() = runTest {
        val viewModel = UpdatePasswordViewModel(profileService = MockProfileService())
        viewModel.setCurrentPassword("old-password")
        viewModel.setNewPassword("new-password-1")
        viewModel.setConfirmPassword("new-password-1")

        assertNull(viewModel.preflightError())
        assertTrue(viewModel.canSubmit())
    }

    @Test
    fun `submit success calls onSuccess and goes back to idle`() = runTest {
        val service = MockProfileService(
            updatePasswordResult = { _, _ -> Result.success(Unit) },
        )
        val viewModel = UpdatePasswordViewModel(profileService = service)
        viewModel.setCurrentPassword("old-password")
        viewModel.setNewPassword("new-password-1")
        viewModel.setConfirmPassword("new-password-1")

        var dismissed = false
        viewModel.submit(onSuccess = { dismissed = true })
        advanceUntilIdle()

        assertTrue(dismissed)
        assertEquals(UpdatePasswordStatus.Idle, viewModel.state.value.status)
        assertTrue(service.callLog.contains("updatePassword"))
    }

    @Test
    fun `submit InvalidCredentials surfaces wrong-password copy`() = runTest {
        val service = MockProfileService(
            updatePasswordResult = { _, _ -> Result.failure(AppError.InvalidCredentials) },
        )
        val viewModel = UpdatePasswordViewModel(profileService = service)
        viewModel.setCurrentPassword("wrong-password")
        viewModel.setNewPassword("new-password-1")
        viewModel.setConfirmPassword("new-password-1")

        var dismissed = false
        viewModel.submit(onSuccess = { dismissed = true })
        advanceUntilIdle()

        assertFalse(dismissed)
        val status = viewModel.state.value.status
        assertTrue(status is UpdatePasswordStatus.Error)
        assertTrue(
            (status as UpdatePasswordStatus.Error).message.contains("Current password", ignoreCase = true),
        )
    }

    @Test
    fun `submit ValidationFailed surfaces form-check copy`() = runTest {
        val service = MockProfileService(
            updatePasswordResult = { _, _ -> Result.failure(AppError.ValidationFailed("server says no")) },
        )
        val viewModel = UpdatePasswordViewModel(profileService = service)
        viewModel.setCurrentPassword("old-password")
        viewModel.setNewPassword("new-password-1")
        viewModel.setConfirmPassword("new-password-1")

        viewModel.submit(onSuccess = {})
        advanceUntilIdle()

        val status = viewModel.state.value.status
        assertTrue(status is UpdatePasswordStatus.Error)
        assertTrue((status as UpdatePasswordStatus.Error).message.contains("check", ignoreCase = true))
    }

    @Test
    fun `submit Network surfaces network copy`() = runTest {
        val service = MockProfileService(
            updatePasswordResult = { _, _ -> Result.failure(AppError.Network(IllegalStateException("offline"))) },
        )
        val viewModel = UpdatePasswordViewModel(profileService = service)
        viewModel.setCurrentPassword("old-password")
        viewModel.setNewPassword("new-password-1")
        viewModel.setConfirmPassword("new-password-1")

        viewModel.submit(onSuccess = {})
        advanceUntilIdle()

        val status = viewModel.state.value.status
        assertTrue(status is UpdatePasswordStatus.Error)
        assertTrue((status as UpdatePasswordStatus.Error).message.contains("Network", ignoreCase = true))
    }

    @Test
    fun `editing a field clears prior error`() = runTest {
        val service = MockProfileService(
            updatePasswordResult = { _, _ -> Result.failure(AppError.InvalidCredentials) },
        )
        val viewModel = UpdatePasswordViewModel(profileService = service)
        viewModel.setCurrentPassword("wrong-password")
        viewModel.setNewPassword("new-password-1")
        viewModel.setConfirmPassword("new-password-1")
        viewModel.submit(onSuccess = {})
        advanceUntilIdle()
        assertTrue(viewModel.state.value.status is UpdatePasswordStatus.Error)

        viewModel.setCurrentPassword("right-password")
        assertEquals(UpdatePasswordStatus.Idle, viewModel.state.value.status)
    }

    @Test
    fun `clearError resets to idle`() = runTest {
        val service = MockProfileService(
            updatePasswordResult = { _, _ -> Result.failure(AppError.InvalidCredentials) },
        )
        val viewModel = UpdatePasswordViewModel(profileService = service)
        viewModel.setCurrentPassword("wrong-password")
        viewModel.setNewPassword("new-password-1")
        viewModel.setConfirmPassword("new-password-1")
        viewModel.submit(onSuccess = {})
        advanceUntilIdle()

        viewModel.clearError()
        assertEquals(UpdatePasswordStatus.Idle, viewModel.state.value.status)
    }

    @Test
    fun `submit short-circuits when preflight fails`() = runTest {
        val service = MockProfileService()
        val viewModel = UpdatePasswordViewModel(profileService = service)
        // Only new password set → preflight fails.
        viewModel.setNewPassword("new-password-1")

        var dismissed = false
        viewModel.submit(onSuccess = { dismissed = true })
        advanceUntilIdle()

        assertFalse(dismissed)
        assertTrue(viewModel.state.value.status is UpdatePasswordStatus.Error)
        assertTrue(service.callLog.isEmpty())
    }
}
