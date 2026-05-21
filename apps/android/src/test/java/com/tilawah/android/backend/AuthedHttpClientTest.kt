package com.tilawah.android.backend

import com.tilawah.android.app.AppError
import com.tilawah.android.storage.InMemoryAuthSession
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runTest
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Before
import org.junit.Test

class AuthedHttpClientTest {

    private lateinit var server: MockWebServer

    @Before
    fun start() {
        server = MockWebServer().apply { start() }
    }

    @After
    fun stop() {
        server.shutdown()
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
}
