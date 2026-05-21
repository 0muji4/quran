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
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class HttpProfileServiceTest {

    private lateinit var server: MockWebServer
    private lateinit var service: HttpProfileService

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
        service = HttpProfileService(
            http = DefaultAuthedHttpClient(session, OkHttpClient()),
            baseUrl = server.url("/").toString(),
        )
    }

    @After
    fun stop() {
        server.shutdown()
    }

    @Test
    fun `fetchCurrentUser parses user envelope`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """
                {"user":{"id":"u-1","email":"noor@example.com","displayName":"Noor",
                 "createdAt":"2025-05-01T00:00:00.000Z","level":"beginner"}}
                """.trimIndent(),
            ),
        )

        val user = service.fetchCurrentUser()

        assertEquals("u-1", user.id)
        assertEquals("noor@example.com", user.email)
        assertEquals("Noor", user.displayName)
        assertEquals("2025-05-01T00:00:00.000Z", user.createdAt)
        assertEquals("beginner", user.level)
        val recorded = server.takeRequest()
        assertEquals("GET", recorded.method)
        assertTrue(recorded.path?.endsWith("auth/me") == true)
        assertEquals("Bearer a-tok", recorded.getHeader("Authorization"))
    }

    @Test
    fun `updateProfile patches and returns refreshed user`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """
                {"user":{"id":"u-1","email":"noor@example.com","displayName":"Updated",
                 "createdAt":"2025-05-01T00:00:00.000Z","level":"intermediate"}}
                """.trimIndent(),
            ),
        )

        val user = service.updateProfile(displayName = "Updated", level = "intermediate")

        assertEquals("Updated", user.displayName)
        assertEquals("intermediate", user.level)
        val recorded = server.takeRequest()
        assertEquals("PATCH", recorded.method)
        val body = recorded.body.readUtf8()
        assertTrue(body.contains("\"displayName\":\"Updated\""))
        assertTrue(body.contains("\"level\":\"intermediate\""))
    }

    @Test
    fun `updateProfile short-circuits to fetch when both fields are null`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """{"user":{"id":"u-1","email":"noor@example.com","displayName":"Noor"}}""",
            ),
        )

        service.updateProfile(displayName = null, level = null)

        val recorded = server.takeRequest()
        assertEquals("GET", recorded.method)
        assertTrue(recorded.path?.endsWith("auth/me") == true)
    }

    @Test
    fun `updateProfile omits unspecified fields`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """{"user":{"id":"u-1","email":"noor@example.com","displayName":"Noor","level":"advanced"}}""",
            ),
        )

        service.updateProfile(displayName = null, level = "advanced")

        val body = server.takeRequest().body.readUtf8()
        // explicitNulls = false → `displayName` key absent on the wire.
        assertTrue(body.contains("\"level\":\"advanced\""))
        assertTrue(!body.contains("\"displayName\""))
    }

    @Test
    fun `updateEmail surfaces 422 as InvalidCredentials`() {
        server.enqueue(
            MockResponse().setResponseCode(422).setBody("""{"error":"current password is incorrect"}"""),
        )

        assertThrows(AppError.InvalidCredentials::class.java) {
            runBlocking { service.updateEmail(currentPassword = "wrong", newEmail = "new@x.com") }
        }
    }

    @Test
    fun `updateEmail surfaces 409 as EmailInUse`() {
        server.enqueue(MockResponse().setResponseCode(409).setBody("""{"error":"email in use"}"""))

        assertThrows(AppError.EmailInUse::class.java) {
            runBlocking { service.updateEmail(currentPassword = "right", newEmail = "taken@x.com") }
        }
    }

    @Test
    fun `updateEmail 400 surfaces ValidationFailed with server message`() {
        server.enqueue(
            MockResponse().setResponseCode(400).setBody("""{"error":"invalid email"}"""),
        )

        val error = assertThrows(AppError.ValidationFailed::class.java) {
            runBlocking { service.updateEmail(currentPassword = "right", newEmail = "bad") }
        }
        assertTrue(error.reason.contains("invalid"))
    }

    @Test
    fun `updatePassword posts both fields and returns Unit on 204`() = runTest {
        server.enqueue(MockResponse().setResponseCode(204))

        service.updatePassword(currentPassword = "old-pass", newPassword = "new-long-pass")

        val recorded = server.takeRequest()
        assertEquals("POST", recorded.method)
        assertTrue(recorded.path?.endsWith("auth/me/password") == true)
        val body = recorded.body.readUtf8()
        assertTrue(body.contains("\"currentPassword\":\"old-pass\""))
        assertTrue(body.contains("\"newPassword\":\"new-long-pass\""))
    }

    @Test
    fun `updatePassword 422 surfaces InvalidCredentials`() {
        server.enqueue(MockResponse().setResponseCode(422))

        assertThrows(AppError.InvalidCredentials::class.java) {
            runBlocking { service.updatePassword(currentPassword = "wrong", newPassword = "x" + "y".repeat(15)) }
        }
    }

    @Test
    fun `deleteAccount sends DELETE and returns on 204`() = runTest {
        server.enqueue(MockResponse().setResponseCode(204))

        service.deleteAccount()

        val recorded = server.takeRequest()
        assertEquals("DELETE", recorded.method)
        assertTrue(recorded.path?.endsWith("auth/me") == true)
        assertEquals("Bearer a-tok", recorded.getHeader("Authorization"))
    }

    @Test
    fun `deleteAccount 502 surfaces BackendUnavailable`() {
        server.enqueue(MockResponse().setResponseCode(502))

        assertThrows(AppError.BackendUnavailable::class.java) {
            runBlocking { service.deleteAccount() }
        }
    }

    @Test
    fun `fetchCurrentUser 401 surfaces InvalidCredentials`() {
        server.enqueue(MockResponse().setResponseCode(401))

        assertThrows(AppError.InvalidCredentials::class.java) {
            runBlocking { service.fetchCurrentUser() }
        }
    }

    @Test
    fun `fetchCurrentUser tolerates absent optional fields`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """{"user":{"id":"u-1","email":"noor@example.com"}}""",
            ),
        )

        val user = service.fetchCurrentUser()

        assertNull(user.displayName)
        assertNull(user.createdAt)
        assertNull(user.level)
    }
}
