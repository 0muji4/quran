package com.tilawah.android.backend

import com.tilawah.android.app.AppError
import com.tilawah.android.storage.InMemoryAuthSession
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class AuthedHttpClientTest {

    private lateinit var server: MockWebServer
    private val dispatcher = UnconfinedTestDispatcher()

    @Before
    fun start() {
        Dispatchers.setMain(dispatcher)
        server = MockWebServer().apply { start() }
    }

    @After
    fun stop() {
        server.shutdown()
        Dispatchers.resetMain()
    }

    private suspend fun signedInSession(accessToken: String = "a-tok"): InMemoryAuthSession =
        InMemoryAuthSession().apply {
            save(
                AuthSessionPayload(
                    accessToken = accessToken,
                    refreshToken = "r-tok",
                    user = AuthUser(id = "u-1", email = "noor@example.com", displayName = "Noor"),
                ),
            )
        }

    @Test
    fun `attaches bearer token from stored session`() = runTest {
        val session = InMemoryAuthSession().apply {
            save(
                AuthSessionPayload(
                    accessToken = "a-tok",
                    refreshToken = "r-tok",
                    user = AuthUser(id = "u-1", email = "noor@example.com", displayName = "Noor"),
                ),
            )
        }
        val client = DefaultAuthedHttpClient(session, OkHttpClient())
        server.enqueue(MockResponse().setResponseCode(200).setBody("ok"))

        client.send(Request.Builder().url(server.url("/auth/me")).get().build()).close()

        val recorded = server.takeRequest()
        assertEquals("Bearer a-tok", recorded.getHeader("Authorization"))
    }

    @Test
    fun `throws InvalidCredentials when no session is stored`() {
        val client = DefaultAuthedHttpClient(InMemoryAuthSession(), OkHttpClient())

        assertThrows(AppError.InvalidCredentials::class.java) {
            runBlocking {
                client.send(Request.Builder().url(server.url("/auth/me")).get().build())
            }
        }
    }

    @Test
    fun `passes raw status through to caller`() = runTest {
        val session = InMemoryAuthSession().apply {
            save(
                AuthSessionPayload(
                    accessToken = "a-tok",
                    refreshToken = "r-tok",
                    user = AuthUser(id = "u-1", email = "noor@example.com", displayName = null),
                ),
            )
        }
        val client = DefaultAuthedHttpClient(session, OkHttpClient())
        server.enqueue(MockResponse().setResponseCode(422).setBody("""{"error":"wrong"}"""))

        val response = client.send(Request.Builder().url(server.url("/auth/me/email")).get().build())

        assertEquals(422, response.code)
        response.close()
    }

    @Test
    fun `401 triggers refresh and retries the request`() = runTest {
        val session = signedInSession(accessToken = "stale")
        val api = StubRefreshApi(rotated = RefreshedTokens("fresh", "r-2"))
        val refresher = TokenRefresher(
            authApi = api,
            authSession = session,
            scope = CoroutineScope(SupervisorJob() + dispatcher),
        )
        val client = DefaultAuthedHttpClient(session, OkHttpClient(), tokenRefresher = refresher)

        // First call: 401 with stale token. Second call (retry): 200.
        server.enqueue(MockResponse().setResponseCode(401))
        server.enqueue(MockResponse().setResponseCode(200).setBody("ok"))

        val response = client.send(Request.Builder().url(server.url("/auth/me")).get().build())

        assertEquals(200, response.code)
        response.close()
        assertEquals("Bearer stale", server.takeRequest().getHeader("Authorization"))
        assertEquals("Bearer fresh", server.takeRequest().getHeader("Authorization"))
        assertEquals(1, api.refreshCalls)
        val stored = session.sessionFlow().first()!!
        assertEquals("fresh", stored.accessToken)
        assertEquals("r-2", stored.refreshToken)
    }

    @Test
    fun `401 followed by refresh failure clears the session`() = runTest {
        val session = signedInSession()
        val api = StubRefreshApi(throwOnRefresh = AppError.InvalidCredentials)
        val refresher = TokenRefresher(
            authApi = api,
            authSession = session,
            scope = CoroutineScope(SupervisorJob() + dispatcher),
        )
        val client = DefaultAuthedHttpClient(session, OkHttpClient(), tokenRefresher = refresher)
        server.enqueue(MockResponse().setResponseCode(401))

        assertThrows(AppError.InvalidCredentials::class.java) {
            runBlocking {
                client.send(Request.Builder().url(server.url("/auth/me")).get().build())
            }
        }
        // Refresh rejected → session dropped so the UI flips to signed-out.
        assertNull(session.sessionFlow().first())
    }

    @Test
    fun `rotated token rejected again clears the session`() = runTest {
        val session = signedInSession(accessToken = "stale")
        val api = StubRefreshApi(rotated = RefreshedTokens("fresh", "r-2"))
        val refresher = TokenRefresher(
            authApi = api,
            authSession = session,
            scope = CoroutineScope(SupervisorJob() + dispatcher),
        )
        val client = DefaultAuthedHttpClient(session, OkHttpClient(), tokenRefresher = refresher)
        // Both attempts return 401 → confirmed sign-out, no infinite loop.
        server.enqueue(MockResponse().setResponseCode(401))
        server.enqueue(MockResponse().setResponseCode(401))

        assertThrows(AppError.InvalidCredentials::class.java) {
            runBlocking {
                client.send(Request.Builder().url(server.url("/auth/me")).get().build())
            }
        }
        assertNull(session.sessionFlow().first())
    }

    @Test
    fun `transient refresh error bubbles without clearing the session`() = runTest {
        val session = signedInSession()
        val api = StubRefreshApi(throwOnRefresh = AppError.BackendUnavailable("refresh"))
        val refresher = TokenRefresher(
            authApi = api,
            authSession = session,
            scope = CoroutineScope(SupervisorJob() + dispatcher),
        )
        val client = DefaultAuthedHttpClient(session, OkHttpClient(), tokenRefresher = refresher)
        server.enqueue(MockResponse().setResponseCode(401))

        assertThrows(AppError.BackendUnavailable::class.java) {
            runBlocking {
                client.send(Request.Builder().url(server.url("/auth/me")).get().build())
            }
        }
        // Transient 5xx on /auth/refresh → session left intact so the
        // user can retry without re-signing-in.
        assertNotNull(session.sessionFlow().first())
    }

    @Test
    fun `no tokenRefresher wired means 401 passes through unchanged`() = runTest {
        val session = signedInSession()
        val client = DefaultAuthedHttpClient(session, OkHttpClient(), tokenRefresher = null)
        server.enqueue(MockResponse().setResponseCode(401))

        val response = client.send(Request.Builder().url(server.url("/auth/me")).get().build())

        assertEquals(401, response.code)
        response.close()
        // Session intact — bearer-only mode lets the caller decide.
        assertTrue(session.sessionFlow().first() != null)
    }

    private class StubRefreshApi(
        private val rotated: RefreshedTokens? = null,
        private val throwOnRefresh: AppError? = null,
    ) : AuthApi {
        var refreshCalls: Int = 0
            private set

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
            refreshCalls++
            throwOnRefresh?.let { throw it }
            return rotated ?: error("rotated not configured")
        }
    }
}
