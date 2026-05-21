package com.tilawah.android.backend

import com.tilawah.android.app.AppError
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

class OkHttpAuthApiRefreshTest {

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
    fun `refresh 200 returns rotated tokens`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """{"accessToken":"new-access","refreshToken":"new-refresh"}""",
            ),
        )

        val rotated = api.refresh(refreshToken = "old-refresh")

        assertEquals("new-access", rotated.accessToken)
        assertEquals("new-refresh", rotated.refreshToken)
        val recorded = server.takeRequest()
        assertEquals("POST", recorded.method)
        assertTrue(recorded.path?.endsWith("auth/refresh") == true)
        assertTrue(recorded.body.readUtf8().contains("\"refreshToken\":\"old-refresh\""))
    }

    @Test
    fun `refresh 401 surfaces InvalidCredentials`() {
        server.enqueue(MockResponse().setResponseCode(401).setBody("""{"error":"invalid"}"""))

        assertThrows(AppError.InvalidCredentials::class.java) {
            runBlocking { api.refresh(refreshToken = "revoked") }
        }
    }

    @Test
    fun `refresh 400 surfaces ValidationFailed`() {
        server.enqueue(
            MockResponse().setResponseCode(400).setBody("""{"error":"missing refreshToken"}"""),
        )

        val error = assertThrows(AppError.ValidationFailed::class.java) {
            runBlocking { api.refresh(refreshToken = "") }
        }
        assertTrue(error.reason.contains("refreshToken"))
    }

    @Test
    fun `refresh 502 surfaces BackendUnavailable`() {
        server.enqueue(MockResponse().setResponseCode(502))

        assertThrows(AppError.BackendUnavailable::class.java) {
            runBlocking { api.refresh(refreshToken = "good-token") }
        }
    }
}
