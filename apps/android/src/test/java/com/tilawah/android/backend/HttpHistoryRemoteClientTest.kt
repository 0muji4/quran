package com.tilawah.android.backend

import com.tilawah.android.app.AppError
import com.tilawah.android.storage.Attempt
import com.tilawah.android.storage.AttemptStatus
import com.tilawah.android.storage.BestScoreEntry
import com.tilawah.android.storage.InMemoryAuthSession
import com.tilawah.android.storage.LastPracticed
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
import java.time.Instant

class HttpHistoryRemoteClientTest {

    private lateinit var server: MockWebServer
    private lateinit var client: HttpHistoryRemoteClient

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
        client = HttpHistoryRemoteClient(
            http = DefaultAuthedHttpClient(session, OkHttpClient()),
            baseUrl = server.url("/").toString(),
        )
    }

    @After
    fun stop() {
        server.shutdown()
    }

    @Test
    fun `lastPracticed returns null when body is literal null`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200).setBody("null"))

        val result = client.lastPracticed()

        assertNull(result)
        assertTrue(server.takeRequest().path?.endsWith("me/last-practiced") == true)
    }

    @Test
    fun `lastPracticed parses the entry`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """{"surahId":"2","ayahNumber":255,"surahNameEn":"Al-Baqarah",
                   "surahNameAr":"البقرة","ayahCount":286,
                   "practicedAt":"2026-01-04T12:00:00Z"}""".trimIndent(),
            ),
        )

        val result = client.lastPracticed()!!

        assertEquals("2", result.surahId)
        assertEquals(255, result.ayahNumber)
        assertEquals(286, result.ayahCount)
        assertEquals(Instant.parse("2026-01-04T12:00:00Z"), result.practicedAt)
    }

    @Test
    fun `putLastPracticed sends the entry and returns the server view`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """{"surahId":"1","ayahNumber":1,"surahNameEn":"Al-Fatihah",
                   "surahNameAr":"الفاتحة","ayahCount":7,
                   "practicedAt":"2026-01-04T12:00:00Z"}""".trimIndent(),
            ),
        )

        val entry = LastPracticed(
            surahId = "1",
            ayahNumber = 1,
            surahNameEn = "Al-Fatihah",
            surahNameAr = "الفاتحة",
            ayahCount = 7,
            practicedAt = Instant.parse("2026-01-04T12:00:00Z"),
        )
        val result = client.putLastPracticed(entry)

        assertEquals(entry.surahId, result.surahId)
        val recorded = server.takeRequest()
        assertEquals("PUT", recorded.method)
        val body = recorded.body.readUtf8()
        assertTrue(body.contains("\"surahId\":\"1\""))
        assertTrue(body.contains("\"practicedAt\":\"2026-01-04T12:00:00Z\""))
    }

    @Test
    fun `bestScores parses the map`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """{"1:1":{"score":98,"achievedAt":"2026-01-04T12:00:00Z"},
                   "2:255":{"score":75,"achievedAt":"2026-01-05T08:30:00Z"}}""".trimIndent(),
            ),
        )

        val scores = client.bestScores()

        assertEquals(2, scores.size)
        assertEquals(98.0, scores["1:1"]?.score!!, 0.0001)
        assertEquals(Instant.parse("2026-01-05T08:30:00Z"), scores["2:255"]?.achievedAt)
    }

    @Test
    fun `bestScores returns empty map on blank body`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200).setBody(""))

        val result = client.bestScores()

        assertTrue(result.isEmpty())
    }

    @Test
    fun `putBestScore PUTs to keyed path and returns server-applied entry`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """{"score":98,"achievedAt":"2026-01-04T12:00:00Z"}""",
            ),
        )
        val entry = BestScoreEntry(score = 95.0, achievedAt = Instant.parse("2026-01-04T12:00:00Z"))

        val result = client.putBestScore(surahId = "2", ayahNumber = 255, entry = entry)

        // Server MAX semantics may have returned a higher score than we sent.
        assertEquals(98.0, result.score, 0.0001)
        val recorded = server.takeRequest()
        assertEquals("PUT", recorded.method)
        assertTrue(recorded.path?.endsWith("me/best-scores/2:255") == true)
    }

    @Test
    fun `attempts unwraps the envelope and respects limit`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """{"attempts":[
                     {"id":"a1","surahId":"1","surahNameEn":"Al-Fatihah","ayahNumber":1,
                      "score":92,"jobId":"j1","createdAt":"2026-01-04T12:00:00Z",
                      "status":"COMPLETED","durationMs":2100}
                   ]}""".trimIndent(),
            ),
        )

        val attempts = client.attempts(limit = 10)

        assertEquals(1, attempts.size)
        assertEquals("a1", attempts[0].id)
        assertEquals(AttemptStatus.COMPLETED, attempts[0].status)
        val recorded = server.takeRequest()
        assertEquals("GET", recorded.method)
        assertTrue(
            "expected limit=10 in query, got ${recorded.path}",
            recorded.path?.contains("limit=10") == true,
        )
    }

    @Test
    fun `recordAttempt encodes score as integer and POSTs`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(201).setBody(
                """{"id":"server-id","surahId":"1","surahNameEn":"Al-Fatihah","ayahNumber":1,
                   "score":92,"jobId":"j1","createdAt":"2026-01-04T12:00:00Z",
                   "status":"COMPLETED","durationMs":2100}""".trimIndent(),
            ),
        )
        val draft = Attempt(
            id = "client-draft",
            surahId = "1",
            surahNameEn = "Al-Fatihah",
            ayahNumber = 1,
            score = 92.0,
            jobId = "j1",
            createdAt = Instant.parse("2026-01-04T12:00:00Z"),
            status = AttemptStatus.COMPLETED,
            durationMs = 2100,
        )

        val saved = client.recordAttempt(draft)

        // BFF returns its own id; the client-draft id is dropped.
        assertEquals("server-id", saved.id)
        val recorded = server.takeRequest()
        assertEquals("POST", recorded.method)
        val body = recorded.body.readUtf8()
        // zod expects integer; Double encoding would have produced "92.0".
        assertTrue("expected integer score in body, got $body", body.contains("\"score\":92"))
        assertTrue("client id must not leak", !body.contains("client-draft"))
    }

    @Test
    fun `bestScores 502 surfaces BackendUnavailable`() {
        server.enqueue(MockResponse().setResponseCode(502))

        assertThrows(AppError.BackendUnavailable::class.java) {
            runBlocking { client.bestScores() }
        }
    }

    @Test
    fun `lastPracticed 401 surfaces InvalidCredentials`() {
        // No tokenRefresher is wired in this test → 401 propagates.
        server.enqueue(MockResponse().setResponseCode(401))

        assertThrows(AppError.InvalidCredentials::class.java) {
            runBlocking { client.lastPracticed() }
        }
    }

    @Test
    fun `recordAttempt 400 surfaces ValidationFailed`() {
        server.enqueue(
            MockResponse().setResponseCode(400).setBody("""{"error":"score out of range"}"""),
        )

        val error = assertThrows(AppError.ValidationFailed::class.java) {
            runBlocking {
                client.recordAttempt(
                    Attempt(
                        id = "x",
                        surahId = "1",
                        surahNameEn = "Al-Fatihah",
                        ayahNumber = 1,
                        score = 101.0,
                        jobId = "j",
                        createdAt = Instant.parse("2026-01-04T12:00:00Z"),
                        status = AttemptStatus.COMPLETED,
                    ),
                )
            }
        }
        assertTrue(error.reason.contains("score"))
    }
}
