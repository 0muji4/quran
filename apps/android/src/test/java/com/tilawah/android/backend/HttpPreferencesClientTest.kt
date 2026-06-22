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
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class HttpPreferencesClientTest {

    private lateinit var server: MockWebServer
    private lateinit var client: HttpPreferencesClient

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
        client = HttpPreferencesClient(
            http = DefaultAuthedHttpClient(session, OkHttpClient()),
            baseUrl = server.url("/").toString(),
        )
    }

    @After
    fun stop() {
        server.shutdown()
    }

    @Test
    fun `preferences parses the row out of the envelope`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """{"preferences":{"referenceReciterId":"husary-muallim","defaultPlaybackSpeed":1.5,"dailyReminderEnabled":true,"dailyReminderTime":"07:30"}}""",
            ),
        )

        val prefs = client.preferences()

        assertEquals("husary-muallim", prefs.referenceReciterId)
        assertEquals(1.5, prefs.defaultPlaybackSpeed, 0.0)
        assertTrue(prefs.dailyReminderEnabled)
        assertEquals("07:30", prefs.dailyReminderTime)
        assertEquals("GET", server.takeRequest().method)
    }

    @Test
    fun `updatePreferences sends only the patched field and parses the echo`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """{"preferences":{"referenceReciterId":"husary-muallim","defaultPlaybackSpeed":1.25,"dailyReminderEnabled":false,"dailyReminderTime":"08:00"}}""",
            ),
        )

        val echoed = client.updatePreferences(PracticePreferencesPatch(defaultPlaybackSpeed = 1.25))

        assertEquals(1.25, echoed.defaultPlaybackSpeed, 0.0)
        val request = server.takeRequest()
        assertEquals("PATCH", request.method)
        // Unsent fields are dropped on the wire so a PATCH never clobbers a
        // column it didn't touch.
        val body = request.body.readUtf8()
        assertTrue(body.contains("defaultPlaybackSpeed"))
        assertFalse(body.contains("referenceReciterId"))
        assertFalse(body.contains("dailyReminderEnabled"))
        assertFalse(body.contains("dailyReminderTime"))
    }

    @Test
    fun `a false boolean is still sent (not dropped as a default)`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """{"preferences":{"referenceReciterId":"husary-muallim","defaultPlaybackSpeed":1.0,"dailyReminderEnabled":false,"dailyReminderTime":"08:00"}}""",
            ),
        )

        client.updatePreferences(PracticePreferencesPatch(dailyReminderEnabled = false))

        val body = server.takeRequest().body.readUtf8()
        assertTrue(body.contains("dailyReminderEnabled"))
        assertTrue(body.contains("false"))
    }

    @Test
    fun `401 surfaces InvalidCredentials`() {
        server.enqueue(MockResponse().setResponseCode(401))
        assertThrows(AppError.InvalidCredentials::class.java) {
            runBlocking { client.preferences() }
        }
    }

    @Test
    fun `502 surfaces BackendUnavailable`() {
        server.enqueue(MockResponse().setResponseCode(502))
        assertThrows(AppError.BackendUnavailable::class.java) {
            runBlocking { client.preferences() }
        }
    }

    @Test
    fun `malformed body surfaces BackendUnavailable on parse`() {
        server.enqueue(MockResponse().setResponseCode(200).setBody("not json"))
        val error = assertThrows(AppError.BackendUnavailable::class.java) {
            runBlocking { client.preferences() }
        }
        assertTrue(error.operation.contains("parse"))
    }
}
