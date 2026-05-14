package com.tilawah.android.backend

import com.tilawah.android.app.AppError
import kotlinx.coroutines.test.runTest
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class OkHttpAuthApiTest {

    private lateinit var server: MockWebServer
    private lateinit var api: OkHttpAuthApi

    @Before
    fun start() {
        server = MockWebServer().apply { start() }
        api = OkHttpAuthApi(baseUrl = server.url("/").toString(), httpClient = OkHttpClient())
    }

    @After
    fun stop() {
        server.shutdown()
    }

    @Test
    fun `signIn 200 returns access token and user`() = runTest {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """
                    {"accessToken":"a-tok","refreshToken":"r-tok",
                     "user":{"id":"u-1","email":"noor@example.com","displayName":"Noor"}}
                    """.trimIndent(),
                ),
        )

        val session = api.signIn(email = "noor@example.com", password = "correct-horse-battery")

        assertEquals("a-tok", session.accessToken)
        assertEquals("r-tok", session.refreshToken)
        assertEquals("u-1", session.user.id)
        assertEquals("Noor", session.user.displayName)
        val recorded = server.takeRequest()
        assertEquals("POST", recorded.method)
        assertTrue(recorded.path?.endsWith("auth/login") == true)
        assertTrue(recorded.body.readUtf8().contains("\"email\":\"noor@example.com\""))
    }

    @Test
    fun `signIn 401 surfaces InvalidCredentials`() = runTest {
        server.enqueue(MockResponse().setResponseCode(401).setBody("""{"error":"invalid"}"""))

        assertThrows(AppError.InvalidCredentials::class.java) {
            kotlinx.coroutines.runBlocking { api.signIn("noor@example.com", "nope") }
        }
    }

    @Test
    fun `signUp 409 surfaces EmailInUse`() = runTest {
        server.enqueue(MockResponse().setResponseCode(409).setBody("""{"error":"email in use"}"""))

        assertThrows(AppError.EmailInUse::class.java) {
            kotlinx.coroutines.runBlocking {
                api.signUp(email = "noor@example.com", password = "long-enough-pw", displayName = null)
            }
        }
    }

    @Test
    fun `signUp 400 surfaces ValidationFailed with server message`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(400).setBody("""{"error":"password too short"}"""),
        )

        val error = assertThrows(AppError.ValidationFailed::class.java) {
            kotlinx.coroutines.runBlocking {
                api.signUp(email = "noor@example.com", password = "x", displayName = "Noor")
            }
        }
        assertTrue(error.reason.contains("password"))
    }

    @Test
    fun `signIn 500 surfaces BackendUnavailable`() = runTest {
        server.enqueue(MockResponse().setResponseCode(503))

        assertThrows(AppError.BackendUnavailable::class.java) {
            kotlinx.coroutines.runBlocking { api.signIn("noor@example.com", "x") }
        }
    }
}
