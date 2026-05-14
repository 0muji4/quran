package com.tilawah.android.features.profile

import com.tilawah.android.backend.AuthSessionPayload
import com.tilawah.android.backend.AuthUser
import com.tilawah.android.storage.InMemoryAuthSession
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
        val viewModel = ProfileViewModel(authSession = session)
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
        val viewModel = ProfileViewModel(authSession = session)
        advanceUntilIdle()
        assertEquals("Noor", viewModel.session.value?.user?.displayName)

        viewModel.signOut()
        advanceUntilIdle()

        assertNull(viewModel.session.value)
        assertNull(session.sessionFlow().first())
    }

    private fun samplePayload() = AuthSessionPayload(
        accessToken = "a",
        refreshToken = "r",
        user = AuthUser(id = "u-1", email = "noor@example.com", displayName = "Noor"),
    )
}
