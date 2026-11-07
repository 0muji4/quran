package com.tilawah.android.features.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelStore
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.tilawah.android.backend.AuthSessionPayload
import com.tilawah.android.backend.AuthUser
import com.tilawah.android.backend.MockProfileService
import com.tilawah.android.storage.Attempt
import com.tilawah.android.storage.AttemptStatus
import com.tilawah.android.storage.InMemoryAuthSession
import com.tilawah.android.storage.InMemoryHistoryStore
import com.tilawah.android.storage.toAuthUser
import java.time.Duration
import java.time.Instant
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotSame
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
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
        // the sheet dismisses; the open sheet must not change under it.
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
        val editViewModel = viewModel.sheetViewModel {
            EditProfileViewModel(
                initialUser = user,
                profileService = MockProfileService(
                    updateProfileResult = { name, _ -> Result.success(user.copy(displayName = name)) },
                ),
                authSession = session,
            )
        }
        editViewModel.setDisplayName("Amina")

        editViewModel.submit(onSuccess = viewModel::dismissSheet)
        assertSame(editViewModel, viewModel.existingSheetViewModel<EditProfileViewModel>())
        assertTrue(editViewModel.state.value.isSubmitting)
        assertEquals(ProfileSheet.EditProfile(user), viewModel.activeSheet.value)

        advanceUntilIdle()

        assertNull(viewModel.activeSheet.value)
        assertEquals("Amina", viewModel.session.value?.user?.displayName)
    }

    @Test
    fun `open sheet keeps its ViewModel and input across a rotation`() = runTest(dispatcher) {
        val session = InMemoryAuthSession()
        val viewModel = signedIn(session)
        viewModel.showSheet(ProfileSheet.ChangeEmail(currentEmail = "noor@example.com"))
        val beforeRotation = viewModel.sheetViewModel { changeEmailViewModel(session) }
        beforeRotation.setNewEmail("new@example.com")

        val afterRotation = viewModel.existingSheetViewModel<ChangeEmailViewModel>()

        assertSame(beforeRotation, afterRotation)
        assertEquals("new@example.com", afterRotation.state.value.newEmail)
    }

    @Test
    fun `reopening Update password shows no typed passwords`() = runTest(dispatcher) {
        val viewModel = signedIn(InMemoryAuthSession())
        viewModel.showSheet(ProfileSheet.UpdatePassword)
        val first = viewModel.sheetViewModel { UpdatePasswordViewModel(MockProfileService()) }
        first.setCurrentPassword("old-secret")
        first.setNewPassword("new-secret")
        first.setConfirmPassword("new-secret")

        viewModel.dismissSheet()
        viewModel.showSheet(ProfileSheet.UpdatePassword)
        val second = viewModel.sheetViewModel { UpdatePasswordViewModel(MockProfileService()) }

        assertNotSame(first, second)
        assertEquals("", second.state.value.currentPassword)
        assertEquals("", second.state.value.newPassword)
        assertEquals("", second.state.value.confirmPassword)
    }

    @Test
    fun `reopening Delete account needs the phrase typed again`() = runTest(dispatcher) {
        val session = InMemoryAuthSession()
        val viewModel = signedIn(session)
        viewModel.showSheet(ProfileSheet.DeleteAccount)
        val first = viewModel.sheetViewModel { DeleteAccountViewModel(MockProfileService(), session) }
        first.setConfirmText(DeleteAccountViewModel.CONFIRMATION_PHRASE)

        viewModel.dismissSheet()
        viewModel.showSheet(ProfileSheet.DeleteAccount)
        val second = viewModel.sheetViewModel { DeleteAccountViewModel(MockProfileService(), session) }

        assertEquals("", second.state.value.confirmText)
        assertFalse(second.canSubmit())
    }

    @Test
    fun `reopening Change email shows no typed password`() = runTest(dispatcher) {
        val session = InMemoryAuthSession()
        val viewModel = signedIn(session)
        val sheet = ProfileSheet.ChangeEmail(currentEmail = "noor@example.com")
        viewModel.showSheet(sheet)
        val first = viewModel.sheetViewModel { changeEmailViewModel(session) }
        first.setCurrentPassword("secret")
        first.setNewEmail("new@example.com")

        viewModel.dismissSheet()
        viewModel.showSheet(sheet)
        val second = viewModel.sheetViewModel { changeEmailViewModel(session) }

        assertEquals("", second.state.value.currentPassword)
        assertEquals("", second.state.value.newEmail)
    }

    /**
     * The sheet reopens with the saved values as its baseline. The
     * ViewModel has to compare against the same baseline, or Save stays
     * enabled while `submit` returns without doing anything.
     */
    @Test
    fun `saved name can be changed back after reopening Edit profile`() = runTest(dispatcher) {
        val session = InMemoryAuthSession()
        val viewModel = signedIn(session)
        val service = MockProfileService(
            updateProfileResult = { name, _ ->
                Result.success(samplePayload().user.copy(displayName = name))
            },
        )
        val original = viewModel.session.value!!.toAuthUser()
        viewModel.showSheet(ProfileSheet.EditProfile(original))
        val first = viewModel.sheetViewModel { EditProfileViewModel(original, service, session) }
        first.setDisplayName("Amina")
        first.submit(onSuccess = viewModel::dismissSheet)
        advanceUntilIdle()
        assertNull(viewModel.activeSheet.value)

        val saved = viewModel.session.value!!.toAuthUser()
        viewModel.showSheet(ProfileSheet.EditProfile(saved))
        val second = viewModel.sheetViewModel { EditProfileViewModel(saved, service, session) }
        second.setDisplayName("Noor")
        second.submit(onSuccess = viewModel::dismissSheet)
        advanceUntilIdle()

        assertTrue(service.callLog.contains("updateProfile(Noor, null)"))
        assertEquals("Noor", viewModel.session.value?.user?.displayName)
        assertNull(viewModel.activeSheet.value)
    }

    @Test
    fun `dismissing a sheet clears its ViewModels`() = runTest(dispatcher) {
        val viewModel = signedIn(InMemoryAuthSession())
        viewModel.showSheet(ProfileSheet.UpdatePassword)
        val probe = viewModel.sheetViewModel { ProbeViewModel() }

        viewModel.dismissSheet()

        assertTrue(probe.cleared)
    }

    @Test
    fun `losing the session clears the open sheet's ViewModels`() = runTest(dispatcher) {
        val session = InMemoryAuthSession()
        val viewModel = signedIn(session)
        viewModel.showSheet(ProfileSheet.UpdatePassword)
        val probe = viewModel.sheetViewModel { ProbeViewModel() }

        session.clear()
        advanceUntilIdle()

        assertTrue(probe.cleared)
    }

    @Test
    fun `clearing the ProfileViewModel clears the open sheet's ViewModels`() = runTest(dispatcher) {
        val session = InMemoryAuthSession()
        session.save(samplePayload())
        val activityStore = ViewModelStore()
        val viewModel = ViewModelProvider(
            activityStore,
            viewModelFactory {
                initializer { ProfileViewModel(authSession = session, historyStore = InMemoryHistoryStore()) }
            },
        )[ProfileViewModel::class.java]
        advanceUntilIdle()
        viewModel.showSheet(ProfileSheet.UpdatePassword)
        val probe = viewModel.sheetViewModel { ProbeViewModel() }

        activityStore.clear()

        assertTrue(probe.cleared)
    }

    @Test
    fun `showing a sheet while one is open keeps the open one`() = runTest(dispatcher) {
        val viewModel = signedIn(InMemoryAuthSession())
        viewModel.showSheet(ProfileSheet.UpdatePassword)
        val probe = viewModel.sheetViewModel { ProbeViewModel() }

        viewModel.showSheet(ProfileSheet.DeleteAccount)

        assertEquals(ProfileSheet.UpdatePassword, viewModel.activeSheet.value)
        assertFalse(probe.cleared)
    }

    /**
     * Opening a sheet clears anything a last frame of the closing sheet
     * re-created, which would otherwise carry the old seed values.
     */
    @Test
    fun `ViewModel re-created after a dismiss is gone on the next open`() = runTest(dispatcher) {
        val viewModel = signedIn(InMemoryAuthSession())
        viewModel.showSheet(ProfileSheet.UpdatePassword)
        viewModel.dismissSheet()
        val lateFrame = viewModel.sheetViewModel { ProbeViewModel() }

        viewModel.showSheet(ProfileSheet.UpdatePassword)

        assertTrue(lateFrame.cleared)
    }

    /**
     * Clearing the session closes the sheet before `submit` calls back,
     * so the callback has to tolerate a sheet that is already closed.
     */
    @Test
    fun `deleting the account signs out and closes the sheet`() = runTest(dispatcher) {
        val session = InMemoryAuthSession()
        val viewModel = signedIn(session)
        val service = MockProfileService()
        viewModel.showSheet(ProfileSheet.DeleteAccount)
        val deleteViewModel = viewModel.sheetViewModel { DeleteAccountViewModel(service, session) }
        deleteViewModel.setConfirmText(DeleteAccountViewModel.CONFIRMATION_PHRASE)

        deleteViewModel.submit(onSuccess = viewModel::dismissSheet)
        advanceUntilIdle()

        assertTrue(service.callLog.contains("deleteAccount"))
        assertNull(viewModel.session.value)
        assertNull(viewModel.activeSheet.value)
    }

    private suspend fun TestScope.signedIn(session: InMemoryAuthSession): ProfileViewModel {
        session.save(samplePayload())
        val viewModel = ProfileViewModel(authSession = session, historyStore = InMemoryHistoryStore())
        advanceUntilIdle()
        return viewModel
    }

    private fun changeEmailViewModel(session: InMemoryAuthSession) = ChangeEmailViewModel(
        currentEmail = "noor@example.com",
        profileService = MockProfileService(),
        authSession = session,
    )

    /** Gets a ViewModel the way `ProfileAuthHost` does. */
    private inline fun <reified VM : ViewModel> ProfileViewModel.sheetViewModel(
        noinline create: () -> VM,
    ): VM = ViewModelProvider(
        sheetViewModels,
        viewModelFactory { initializer { create() } },
    )[VM::class.java]

    /** What a rebuilt composition gets: fails if the owner has to re-create it. */
    private inline fun <reified VM : ViewModel> ProfileViewModel.existingSheetViewModel(): VM =
        sheetViewModel<VM> { error("${VM::class.simpleName} was re-created") }

    private class ProbeViewModel : ViewModel() {
        var cleared = false
            private set

        override fun onCleared() {
            cleared = true
        }
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
