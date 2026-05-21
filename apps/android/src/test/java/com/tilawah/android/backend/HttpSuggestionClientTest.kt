package com.tilawah.android.backend

import com.tilawah.android.app.AppError
import com.tilawah.android.storage.InMemoryAuthSession
import kotlinx.coroutines.runBlocking
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

class HttpSuggestionClientTest {

    private lateinit var server: MockWebServer
    private lateinit var client: HttpSuggestionClient

    @Before
    fun start() {
        server = MockWebServer().apply { start() }
        val session = InMemoryAuthSession().apply {
            runBlocking {
                save(
                    AuthSessionPayload(
                        accessToken = "a-tok",
                        refreshToken = "r-tok",
                        user = AuthUser(id = "u-1", email = "noor@example.com", displayName = "Noor"),
                    ),
                )
            }
        }
        client = HttpSuggestionClient(
            http = DefaultAuthedHttpClient(session, OkHttpClient()),
            baseUrl = server.url("/").toString(),
        )
    }

    @After
    fun stop() {
        server.shutdown()
    }

    @Test
    fun `suggestions parses suggested surah and difficulty map`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """{
                     "suggested": { "surahId": "112", "reason": "short_unpracticed" },
                     "difficulties": { "1": "easy", "2": "hard", "112": "easy" }
                   }""".trimIndent(),
            ),
        )

        val result = client.suggestions()

        assertEquals("112", result.surahId)
        assertEquals(SuggestionReason.ShortUnpracticed, result.reason)
        assertEquals(Difficulty.Easy, result.difficulties["1"])
        assertEquals(Difficulty.Hard, result.difficulties["2"])
    }

    @Test
    fun `unknown reason falls back to Unknown enum value`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """{"suggested": { "surahId": "112", "reason": "weakest_long_surah" }, "difficulties": {}}""",
            ),
        )

        val result = client.suggestions()

        assertEquals(SuggestionReason.Unknown, result.reason)
    }

    @Test
    fun `401 surfaces InvalidCredentials`() {
        server.enqueue(MockResponse().setResponseCode(401))

        assertThrows(AppError.InvalidCredentials::class.java) {
            runBlocking { client.suggestions() }
        }
    }

    @Test
    fun `502 surfaces BackendUnavailable`() {
        server.enqueue(MockResponse().setResponseCode(502))

        assertThrows(AppError.BackendUnavailable::class.java) {
            runBlocking { client.suggestions() }
        }
    }

    @Test
    fun `malformed body surfaces BackendUnavailable on parse`() {
        server.enqueue(MockResponse().setResponseCode(200).setBody("not json"))

        val error = assertThrows(AppError.BackendUnavailable::class.java) {
            runBlocking { client.suggestions() }
        }
        assertTrue(error.operation.contains("parse"))
    }
}
