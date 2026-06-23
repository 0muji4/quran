package com.tilawah.android.backend

import com.apollographql.apollo.api.http.HttpMethod
import com.apollographql.apollo.api.http.HttpRequest
import com.apollographql.apollo.api.http.HttpResponse
import com.apollographql.apollo.api.http.get
import com.apollographql.apollo.network.http.HttpInterceptorChain
import com.tilawah.android.app.AppError
import com.tilawah.android.storage.AuthSession
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
import okio.Buffer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class BearerAuthInterceptorTest {

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
    fun `attaches Bearer header when a session is stored`() = runTest {
        val session = signedInSession(accessToken = "a-tok")
        val chain = CapturingChain(responses = listOf(okResponse()))
        val interceptor = BearerAuthInterceptor(authSession = session)

        interceptor.intercept(graphqlRequest(), chain)

        assertEquals("Bearer a-tok", chain.recorded[0].headers.get("Authorization"))
    }

    @Test
    fun `omits Bearer header when no session is stored`() = runTest {
        val session = InMemoryAuthSession()
        val chain = CapturingChain(responses = listOf(okResponse()))
        val interceptor = BearerAuthInterceptor(authSession = session)

        interceptor.intercept(graphqlRequest(), chain)

        assertNull(chain.recorded[0].headers.get("Authorization"))
    }

    @Test
    fun `401 without a refresher passes the response through unchanged`() = runTest {
        val session = signedInSession()
        val chain = CapturingChain(responses = listOf(statusResponse(401)))
        val interceptor = BearerAuthInterceptor(authSession = session, tokenRefresher = null)

        val response = interceptor.intercept(graphqlRequest(), chain)

        assertEquals(401, response.statusCode)
        assertEquals(1, chain.recorded.size)
        // Session intact — the caller decides what to do with the 401.
        assertTrue(session.sessionFlow().first() != null)
    }

    @Test
    fun `401 triggers refresh and retries with the rotated token`() = runTest {
        val session = signedInSession(accessToken = "stale")
        val api = StubRefreshApi(rotated = RefreshedTokens("fresh", "r-2"))
        val refresher = TokenRefresher(
            authApi = api,
            authSession = session,
            scope = CoroutineScope(SupervisorJob() + dispatcher),
        )
        val chain = CapturingChain(responses = listOf(statusResponse(401), okResponse()))
        val interceptor = BearerAuthInterceptor(session, refresher)

        val response = interceptor.intercept(graphqlRequest(), chain)

        assertEquals(200, response.statusCode)
        assertEquals("Bearer stale", chain.recorded[0].headers.get("Authorization"))
        assertEquals("Bearer fresh", chain.recorded[1].headers.get("Authorization"))
        assertEquals(1, api.refreshCalls)
        val stored = session.sessionFlow().first()!!
        assertEquals("fresh", stored.accessToken)
        assertEquals("r-2", stored.refreshToken)
    }

    @Test
    fun `refresh raising InvalidCredentials clears the session and propagates`() = runTest {
        val session = signedInSession()
        val api = StubRefreshApi(throwOnRefresh = AppError.InvalidCredentials)
        val refresher = TokenRefresher(
            authApi = api,
            authSession = session,
            scope = CoroutineScope(SupervisorJob() + dispatcher),
        )
        val chain = CapturingChain(responses = listOf(statusResponse(401)))
        val interceptor = BearerAuthInterceptor(session, refresher)

        assertThrows(AppError.InvalidCredentials::class.java) {
            runBlocking { interceptor.intercept(graphqlRequest(), chain) }
        }
        assertNull(session.sessionFlow().first())
    }

    @Test
    fun `second 401 after refresh clears the session and stops`() = runTest {
        val session = signedInSession(accessToken = "stale")
        val api = StubRefreshApi(rotated = RefreshedTokens("fresh", "r-2"))
        val refresher = TokenRefresher(
            authApi = api,
            authSession = session,
            scope = CoroutineScope(SupervisorJob() + dispatcher),
        )
        // Both attempts get 401 → no infinite loop, session dropped.
        val chain = CapturingChain(responses = listOf(statusResponse(401), statusResponse(401)))
        val interceptor = BearerAuthInterceptor(session, refresher)

        assertThrows(AppError.InvalidCredentials::class.java) {
            runBlocking { interceptor.intercept(graphqlRequest(), chain) }
        }
        assertEquals(2, chain.recorded.size)
        assertNull(session.sessionFlow().first())
    }

    private suspend fun signedInSession(accessToken: String = "a-tok"): AuthSession =
        InMemoryAuthSession().apply {
            save(
                AuthSessionPayload(
                    accessToken = accessToken,
                    refreshToken = "r-tok",
                    user = AuthUser(id = "u-1", email = "noor@example.com", displayName = "Noor"),
                ),
            )
        }

    private fun graphqlRequest(): HttpRequest =
        HttpRequest.Builder(method = HttpMethod.Post, url = "https://bff.example.com/graphql").build()

    private fun okResponse(): HttpResponse =
        HttpResponse.Builder(statusCode = 200).body(Buffer().writeUtf8("{}")).build()

    private fun statusResponse(code: Int): HttpResponse =
        HttpResponse.Builder(statusCode = code).body(Buffer().writeUtf8("")).build()

    private class CapturingChain(
        private val responses: List<HttpResponse>,
    ) : HttpInterceptorChain {
        val recorded = mutableListOf<HttpRequest>()
        private var index = 0

        override suspend fun proceed(request: HttpRequest): HttpResponse {
            recorded += request
            return responses[index++]
        }
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

        override suspend fun requestGoogleNonce(): String = error("requestGoogleNonce not used")

        override suspend fun signInWithGoogle(idToken: String): AuthSessionPayload =
            error("signInWithGoogle not used")
    }
}
