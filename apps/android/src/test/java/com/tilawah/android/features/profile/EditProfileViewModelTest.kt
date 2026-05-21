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
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class EditProfileViewModelTest {

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
        displayName: String? = "Noor",
        level: String? = "beginner",
        email: String = "noor@example.com",
    ) = AuthUser(
        id = "u-1",
        email = email,
        displayName = displayName,
        createdAt = "2026-01-04T12:00:00.000Z",
        level = level,
    )

    private suspend fun newSession(user: AuthUser): InMemoryAuthSession {
        val session = InMemoryAuthSession()
        session.save(
            AuthSessionPayload(accessToken = "a", refreshToken = "r", user = user),
        )
        return session
    }

    @Test
    fun `initial state seeds from user`() = runTest {
        val user = makeUser(displayName = "Noor", level = "advanced")
        val viewModel = EditProfileViewModel(
            initialUser = user,
            profileService = MockProfileService(),
            authSession = newSession(user),
        )

        val state = viewModel.state.value
        assertEquals("Noor", state.displayName)
        assertEquals("advanced", state.level)
        assertEquals(EditProfileStatus.Idle, state.status)
        assertFalse(state.hasChanges(initialDisplayName = "Noor", initialLevel = "advanced"))
        assertFalse(state.canSubmit(initialDisplayName = "Noor", initialLevel = "advanced"))
    }

    @Test
    fun `displayName whitespace is treated as initial value`() = runTest {
        val user = makeUser(displayName = "  Noor  ")
        val viewModel = EditProfileViewModel(
            initialUser = user,
            profileService = MockProfileService(),
            authSession = newSession(user),
        )

        // The ViewModel stores the trimmed initial for diff purposes;
        // the field itself receives whatever the user types so that
        // leading whitespace mid-edit doesn't snap back.
        viewModel.setDisplayName("Noor")
        assertFalse(viewModel.state.value.canSubmit(initialDisplayName = "Noor", initialLevel = "beginner"))
    }

    @Test
    fun `canSubmit becomes true when displayName changes`() = runTest {
        val user = makeUser()
        val viewModel = EditProfileViewModel(
            initialUser = user,
            profileService = MockProfileService(),
            authSession = newSession(user),
        )

        viewModel.setDisplayName("Noor Updated")
        assertTrue(viewModel.state.value.canSubmit(initialDisplayName = "Noor", initialLevel = "beginner"))
    }

    @Test
    fun `canSubmit becomes true when level changes`() = runTest {
        val user = makeUser(level = "beginner")
        val viewModel = EditProfileViewModel(
            initialUser = user,
            profileService = MockProfileService(),
            authSession = newSession(user),
        )

        viewModel.setLevel("advanced")
        assertTrue(viewModel.state.value.canSubmit(initialDisplayName = "Noor", initialLevel = "beginner"))
    }

    @Test
    fun `canSubmit is false when clearing a non-empty displayName`() = runTest {
        // BFF zod rejects an empty string; the form must keep Save
        // disabled rather than land in a 400.
        val user = makeUser(displayName = "Noor")
        val viewModel = EditProfileViewModel(
            initialUser = user,
            profileService = MockProfileService(),
            authSession = newSession(user),
        )

        viewModel.setDisplayName("")
        assertFalse(viewModel.state.value.canSubmit(initialDisplayName = "Noor", initialLevel = "beginner"))
    }

    @Test
    fun `canSubmit is true when initial name is empty and only level changes`() = runTest {
        val user = makeUser(displayName = null, level = null)
        val viewModel = EditProfileViewModel(
            initialUser = user,
            profileService = MockProfileService(),
            authSession = newSession(user),
        )

        viewModel.setLevel("beginner")
        assertTrue(viewModel.state.value.canSubmit(initialDisplayName = "", initialLevel = null))
    }

    @Test
    fun `submit success patches BFF and updates session user`() = runTest {
        val refreshed = makeUser(displayName = "Noor Updated", level = "advanced")
        val service = MockProfileService(
            updateProfileResult = { _, _ -> Result.success(refreshed) },
        )
        val user = makeUser()
        val session = newSession(user)
        val viewModel = EditProfileViewModel(
            initialUser = user,
            profileService = service,
            authSession = session,
        )
        viewModel.setDisplayName("Noor Updated")
        viewModel.setLevel("advanced")

        var dismissed = false
        viewModel.submit(onSuccess = { dismissed = true })
        advanceUntilIdle()

        assertTrue(dismissed)
        assertEquals(EditProfileStatus.Idle, viewModel.state.value.status)
        val storedUser = session.sessionFlow().first()
        assertEquals("Noor Updated", storedUser?.user?.displayName)
        assertEquals("advanced", storedUser?.user?.level)
        assertTrue(service.callLog.any { it.startsWith("updateProfile(Noor Updated, advanced)") })
    }

    @Test
    fun `submit only sends changed fields to the BFF`() = runTest {
        val refreshed = makeUser(level = "advanced")
        val service = MockProfileService(
            updateProfileResult = { _, _ -> Result.success(refreshed) },
        )
        val user = makeUser(displayName = "Noor", level = "beginner")
        val viewModel = EditProfileViewModel(
            initialUser = user,
            profileService = service,
            authSession = newSession(user),
        )
        viewModel.setLevel("advanced")

        viewModel.submit(onSuccess = {})
        advanceUntilIdle()

        // displayName is unchanged → null on the wire; level is the
        // only delta.
        assertTrue(service.callLog.contains("updateProfile(null, advanced)"))
    }

    @Test
    fun `submit failure with ValidationFailed sets error status`() = runTest {
        val service = MockProfileService(
            updateProfileResult = { _, _ -> Result.failure(AppError.ValidationFailed("bad")) },
        )
        val user = makeUser()
        val viewModel = EditProfileViewModel(
            initialUser = user,
            profileService = service,
            authSession = newSession(user),
        )
        viewModel.setDisplayName("Noor Updated")

        var dismissed = false
        viewModel.submit(onSuccess = { dismissed = true })
        advanceUntilIdle()

        assertFalse(dismissed)
        val status = viewModel.state.value.status
        assertTrue("expected Error, got $status", status is EditProfileStatus.Error)
    }

    @Test
    fun `submit failure with BackendUnavailable surfaces fallback error`() = runTest {
        val service = MockProfileService(
            updateProfileResult = { _, _ -> Result.failure(AppError.BackendUnavailable("profile.update")) },
        )
        val user = makeUser()
        val viewModel = EditProfileViewModel(
            initialUser = user,
            profileService = service,
            authSession = newSession(user),
        )
        viewModel.setDisplayName("Noor Updated")

        viewModel.submit(onSuccess = {})
        advanceUntilIdle()

        assertTrue(viewModel.state.value.status is EditProfileStatus.Error)
    }

    @Test
    fun `editing a field after an error clears the error`() = runTest {
        val service = MockProfileService(
            updateProfileResult = { _, _ -> Result.failure(AppError.ValidationFailed("bad")) },
        )
        val user = makeUser()
        val viewModel = EditProfileViewModel(
            initialUser = user,
            profileService = service,
            authSession = newSession(user),
        )
        viewModel.setDisplayName("Noor Updated")
        viewModel.submit(onSuccess = {})
        advanceUntilIdle()
        assertTrue(viewModel.state.value.status is EditProfileStatus.Error)

        viewModel.setDisplayName("Noor Updated 2")
        assertEquals(EditProfileStatus.Idle, viewModel.state.value.status)
    }

    @Test
    fun `clearError resets to idle`() = runTest {
        val service = MockProfileService(
            updateProfileResult = { _, _ -> Result.failure(AppError.ValidationFailed("bad")) },
        )
        val user = makeUser()
        val viewModel = EditProfileViewModel(
            initialUser = user,
            profileService = service,
            authSession = newSession(user),
        )
        viewModel.setDisplayName("Noor Updated")
        viewModel.submit(onSuccess = {})
        advanceUntilIdle()

        viewModel.clearError()
        assertEquals(EditProfileStatus.Idle, viewModel.state.value.status)
    }

    @Test
    fun `submit short-circuits when canSubmit is false`() = runTest {
        val service = MockProfileService()
        val user = makeUser()
        val viewModel = EditProfileViewModel(
            initialUser = user,
            profileService = service,
            authSession = newSession(user),
        )
        // No edits → canSubmit is false → submit() does nothing.

        var dismissed = false
        viewModel.submit(onSuccess = { dismissed = true })
        advanceUntilIdle()

        assertFalse(dismissed)
        assertTrue(service.callLog.isEmpty())
    }

    @Test
    fun `level options match BFF zod vocabulary`() {
        assertEquals(listOf("beginner", "intermediate", "advanced"), EditProfileLevelOptions)
    }

    @Test
    fun `updateUser leaves a missing session untouched`() = runTest {
        val session = InMemoryAuthSession()
        // No save() — flow starts empty.

        session.updateUser(makeUser())

        val current = session.sessionFlow().first()
        assertNull(current)
    }
}
