package com.tilawah.android.features.profile

import com.tilawah.android.backend.AuthSessionPayload
import com.tilawah.android.backend.AuthUser
import com.tilawah.android.backend.MockProfileService
import com.tilawah.android.storage.Attempt
import com.tilawah.android.storage.AttemptStatus
import com.tilawah.android.storage.InMemoryAuthSession
import com.tilawah.android.storage.InMemoryHistoryStore
import java.time.Duration
import java.time.Instant
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class ProfileViewModelTest {

    private val dispatcher = StandardTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `session flow starts null and reflects saves`() = runTest(dispatcher) {
        val session = InMemoryAuthSession()
        val viewModel = ProfileViewModel(authSession = session, historyStore = InMemoryHistoryStore())
        advanceUntilIdle()

        assertNull(viewModel.session.value)

        session.save(samplePayload())
        advanceUntilIdle()

        assertEquals("Noor", viewModel.session.value?.user?.displayName)
    }

    @Test
    fun `signOut clears the stored session`() = runTest(dispatcher) {
        val session = InMemoryAuthSession()
        session.save(samplePayload())
        val viewModel = ProfileViewModel(authSession = session, historyStore = InMemoryHistoryStore())
        advanceUntilIdle()
        assertEquals("Noor", viewModel.session.value?.user?.displayName)

        viewModel.signOut()
        advanceUntilIdle()

        assertNull(viewModel.session.value)
        assertNull(session.sessionFlow().first())
    }

    @Test
    fun `streakDays counts consecutive practice days from history`() = runTest(dispatcher) {
        val history = InMemoryHistoryStore()
        val now = Instant.now()
        history.recordAttempt(attemptAt(now))
        history.recordAttempt(attemptAt(now.minus(Duration.ofDays(1))))
        val viewModel = ProfileViewModel(
            authSession = InMemoryAuthSession(),
            historyStore = history,
        )
        advanceUntilIdle()

        assertEquals(2, viewModel.streakDays.value)
    }

    @Test
    fun `activeSheet starts closed and follows show and dismiss`() = runTest(dispatcher) {
        val session = InMemoryAuthSession()
        session.save(samplePayload())
        val viewModel = ProfileViewModel(authSession = session, historyStore = InMemoryHistoryStore())
        advanceUntilIdle()
        assertNull(viewModel.activeSheet.value)

        viewModel.showSheet(ProfileSheet.UpdatePassword)
        assertEquals(ProfileSheet.UpdatePassword, viewModel.activeSheet.value)

        viewModel.dismissSheet()
        assertNull(viewModel.activeSheet.value)
    }

    @Test
    fun `open sheet keeps its snapshot when the session user changes`() = runTest(dispatcher) {
        val session = InMemoryAuthSession()
        session.save(samplePayload())
        val viewModel = ProfileViewModel(authSession = session, historyStore = InMemoryHistoryStore())
        advanceUntilIdle()
        val sheet = ProfileSheet.ChangeEmail(currentEmail = "noor@example.com")
        viewModel.showSheet(sheet)

        // A successful change writes the new email to the session before
        // the sheet dismisses; the ViewModel key must not move under it.
        session.updateUser(samplePayload().user.copy(email = "new@example.com"))
        advanceUntilIdle()

        assertEquals(sheet, viewModel.activeSheet.value)
    }

    @Test
    fun `losing the session closes the open sheet`() = runTest(dispatcher) {
        val session = InMemoryAuthSession()
        session.save(samplePayload())
        val viewModel = ProfileViewModel(authSession = session, historyStore = InMemoryHistoryStore())
        advanceUntilIdle()
        viewModel.showSheet(ProfileSheet.DeleteAccount)

        session.clear()
        advanceUntilIdle()

        assertNull(viewModel.activeSheet.value)
    }

    /**
     * A rotation mid-save rebuilds the composition while the ViewModels
     * and the in-flight save survive. The success callback was captured
     * before the rotation, so it has to close the sheet the new
     * composition is showing.
     */
    @Test
    fun `save finishing after the sheet was recomposed still dismisses it`() = runTest(dispatcher) {
        val session = InMemoryAuthSession()
        session.save(samplePayload())
        val user = samplePayload().user
        val viewModel = ProfileViewModel(authSession = session, historyStore = InMemoryHistoryStore())
        advanceUntilIdle()
        viewModel.showSheet(ProfileSheet.EditProfile(user))
        val editViewModel = EditProfileViewModel(
            initialUser = user,
            profileService = MockProfileService(
                updateProfileResult = { name, _ -> Result.success(user.copy(displayName = name)) },
            ),
            authSession = session,
        )
        editViewModel.setDisplayName("Amina")

        editViewModel.submit(onSuccess = viewModel::dismissSheet)
        assertTrue(editViewModel.state.value.isSubmitting)
        assertEquals(ProfileSheet.EditProfile(user), viewModel.activeSheet.value)

        advanceUntilIdle()

        assertNull(viewModel.activeSheet.value)
        assertEquals("Amina", viewModel.session.value?.user?.displayName)
    }

    private fun attemptAt(at: Instant) = Attempt(
        id = at.toString(),
        surahId = "1",
        surahNameEn = "Al-Fatihah",
        ayahNumber = 1,
        score = 0.9,
        jobId = "job",
        createdAt = at,
        status = AttemptStatus.COMPLETED,
    )

    private fun samplePayload() = AuthSessionPayload(
        accessToken = "a",
        refreshToken = "r",
        user = AuthUser(id = "u-1", email = "noor@example.com", displayName = "Noor"),
    )
}
