package com.tilawah.android.backend

import com.tilawah.android.app.AppError
import com.tilawah.android.storage.InMemoryAuthSession
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.util.concurrent.atomic.AtomicInteger

@OptIn(ExperimentalCoroutinesApi::class)
class TokenRefresherTest {

    private val dispatcher = UnconfinedTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private suspend fun signedInSession(refreshToken: String = "r-1"): InMemoryAuthSession {
        val session = InMemoryAuthSession()
        session.save(
            AuthSessionPayload(
                accessToken = "a-1",
                refreshToken = refreshToken,
                user = AuthUser(id = "u-1", email = "noor@example.com", displayName = "Noor"),
            ),
        )
        return session
    }

    @Test
    fun `refresh rotates tokens and persists them`() = runTest {
        val session = signedInSession(refreshToken = "old-refresh")
        val api = StubAuthApi(refreshResult = { RefreshedTokens("new-access", "new-refresh") })
        val refresher = TokenRefresher(api, session, scope = CoroutineScope(SupervisorJob() + dispatcher))

        val rotated = refresher.refresh()

        assertEquals("new-access", rotated.accessToken)
        assertEquals("new-refresh", rotated.refreshToken)
        val stored = session.sessionFlow().first()!!
        assertEquals("new-access", stored.accessToken)
        assertEquals("new-refresh", stored.refreshToken)
        // The refresh token used in the request was the old one.
        assertEquals(listOf("old-refresh"), api.refreshCalls)
    }

    @Test
    fun `refresh throws InvalidCredentials when no session is stored`() {
        val api = StubAuthApi(refreshResult = { error("should not be called") })
        val refresher = TokenRefresher(
            api,
            InMemoryAuthSession(),
            scope = CoroutineScope(SupervisorJob() + dispatcher),
        )

        assertThrows(AppError.InvalidCredentials::class.java) {
            runBlocking { refresher.refresh() }
        }
    }

    @Test
    fun `concurrent refresh calls fire only one network call`() = runTest {
        val session = signedInSession()
        val gate = CompletableDeferred<Unit>()
        val callCount = AtomicInteger(0)
        val api = StubAuthApi(
            refreshResult = {
                callCount.incrementAndGet()
                gate.await()
                RefreshedTokens("new-access", "new-refresh")
            },
        )
        val scope = CoroutineScope(SupervisorJob() + dispatcher)
        val refresher = TokenRefresher(api, session, scope = scope)

        // Three concurrent waiters; only the first triggers a network
        // call, the rest join the in-flight Deferred.
        val a = scope.async { refresher.refresh() }
        val b = scope.async { refresher.refresh() }
        val c = scope.async { refresher.refresh() }

        gate.complete(Unit)
        val resultA = a.await()
        val resultB = b.await()
        val resultC = c.await()

        assertEquals(1, callCount.get())
        assertEquals("new-access", resultA.accessToken)
        assertEquals(resultA, resultB)
        assertEquals(resultA, resultC)
    }

    @Test
    fun `refresh bubbles InvalidCredentials from the BFF`() = runTest {
        val session = signedInSession()
        val api = StubAuthApi(refreshResult = { throw AppError.InvalidCredentials })
        val refresher = TokenRefresher(api, session, scope = CoroutineScope(SupervisorJob() + dispatcher))

        assertThrows(AppError.InvalidCredentials::class.java) {
            runBlocking { refresher.refresh() }
        }
        // Session is left intact — the AuthedHttpClient owns the
        // sign-out decision, not the refresher.
        assertTrue(session.sessionFlow().first() != null)
    }

    /**
     * `StubAuthApi` exists here rather than `MockBackend` so the
     * coalescing test can record per-call timing without a closure
     * mutated from the production path.
     */
    private class StubAuthApi(
        private val refreshResult: suspend () -> RefreshedTokens,
    ) : AuthApi {
        val refreshCalls = mutableListOf<String>()

        override suspend fun signIn(email: String, password: String): AuthSessionPayload {
            error("signIn not used")
        }

        override suspend fun signUp(
            email: String,
            password: String,
            displayName: String?,
        ): AuthSessionPayload {
            error("signUp not used")
        }

        override suspend fun refresh(refreshToken: String): RefreshedTokens {
            refreshCalls += refreshToken
            return refreshResult()
        }
    }
}
