package com.tilawah.android.features.profile

import com.tilawah.android.app.AppError
import com.tilawah.android.backend.MockPreferencesClient
import com.tilawah.android.backend.PracticePreferences
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
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
class PreferencesViewModelTest {

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
    fun `load replaces the optimistic defaults with the stored row`() = runTest {
        val stored = PracticePreferences(
            referenceReciterId = "husary-muallim",
            defaultPlaybackSpeed = 1.5,
            dailyReminderEnabled = true,
            dailyReminderTime = "07:30",
        )
        val client = MockPreferencesClient(preferencesResult = Result.success(stored))
        val viewModel = PreferencesViewModel(client)

        viewModel.load()
        advanceUntilIdle()

        assertEquals(stored, viewModel.state.value.preferences)
        assertTrue(viewModel.state.value.isLoaded)
    }

    @Test
    fun `a failed load keeps the defaults but still marks loaded`() = runTest {
        val client = MockPreferencesClient(
            preferencesResult = Result.failure(AppError.BackendUnavailable("me.preferences")),
        )
        val viewModel = PreferencesViewModel(client)

        viewModel.load()
        advanceUntilIdle()

        assertEquals(PracticePreferences.Default, viewModel.state.value.preferences)
        assertTrue(viewModel.state.value.isLoaded)
    }

    @Test
    fun `load only fetches once`() = runTest {
        val client = MockPreferencesClient()
        val viewModel = PreferencesViewModel(client)

        viewModel.load()
        advanceUntilIdle()
        viewModel.load()
        advanceUntilIdle()

        assertEquals(1, client.callLog.count { it == "preferences" })
    }

    @Test
    fun `an edit reconciles to the server echo, not the local guess`() = runTest {
        // Server normalises 1.25 → 2.0; the echo (not the optimistic value)
        // must become the source of truth.
        val echo = PracticePreferences.Default.copy(defaultPlaybackSpeed = 2.0)
        val client = MockPreferencesClient(updateResult = { Result.success(echo) })
        val viewModel = PreferencesViewModel(client)

        viewModel.setPlaybackSpeed(1.25)
        advanceUntilIdle()

        assertEquals(2.0, viewModel.state.value.preferences.defaultPlaybackSpeed, 0.0)
        assertNull(viewModel.state.value.errorMessage)
    }

    @Test
    fun `an edit sends a single-field patch`() = runTest {
        val client = MockPreferencesClient(
            updateResult = { Result.success(PracticePreferences.Default.copy(referenceReciterId = "husary-muallim")) },
        )
        val viewModel = PreferencesViewModel(client)

        viewModel.setReciter("husary-muallim")
        advanceUntilIdle()

        val patch = client.patches.single()
        assertEquals("husary-muallim", patch.referenceReciterId)
        assertNull(patch.defaultPlaybackSpeed)
        assertNull(patch.dailyReminderEnabled)
        assertNull(patch.dailyReminderTime)
    }

    @Test
    fun `a rejected edit rolls back and surfaces an error`() = runTest {
        val client = MockPreferencesClient(
            updateResult = { Result.failure(AppError.BackendUnavailable("me.preferences.patch")) },
        )
        val viewModel = PreferencesViewModel(client)
        val before = viewModel.state.value.preferences

        viewModel.setReminderEnabled(true)
        advanceUntilIdle()

        assertEquals(before, viewModel.state.value.preferences)
        assertFalse(viewModel.state.value.preferences.dailyReminderEnabled)
        assertNotNull(viewModel.state.value.errorMessage)
    }
}
