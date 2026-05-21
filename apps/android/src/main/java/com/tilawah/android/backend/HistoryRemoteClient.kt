package com.tilawah.android.backend

import com.tilawah.android.app.AppConfig
import com.tilawah.android.app.AppError
import com.tilawah.android.storage.Attempt
import com.tilawah.android.storage.AttemptStatus
import com.tilawah.android.storage.BestScoreEntry
import com.tilawah.android.storage.LastPracticed
import kotlinx.serialization.SerializationException
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.MapSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

/**
 * REST client for the BFF `/me` history surface (last-practiced, best-
 * scores, attempts). Every endpoint here
 * is gated by `requireAuth` on the BFF, so the underlying
 * [AuthedHttpClient] attaches the Bearer header and (with
 * [TokenRefresher] wired) handles the rotate-and-retry path on 401.
 *
 * Mirrors `apps/ios/Sources/QuranRecitationApp/Backend/MeClient.swift`
 * for the history-shaped endpoints. Suggestions live in a separate
 * client landed in a later PR.
 *
 * Errors cross this boundary as [AppError] (see ADR 0006).
 */
interface HistoryRemoteClient {
    suspend fun lastPracticed(): LastPracticed?
    suspend fun putLastPracticed(entry: LastPracticed): LastPracticed
    suspend fun bestScores(): Map<String, BestScoreEntry>
    suspend fun putBestScore(surahId: String, ayahNumber: Int, entry: BestScoreEntry): BestScoreEntry
    suspend fun attempts(limit: Int): List<Attempt>
    suspend fun recordAttempt(attempt: Attempt): Attempt
}

class HttpHistoryRemoteClient(
    private val http: AuthedHttpClient,
    private val baseUrl: String = AppConfig.restBaseUrl,
    private val json: Json = HistoryRemoteJson,
) : HistoryRemoteClient {

    override suspend fun lastPracticed(): LastPracticed? =
        execute(
            request = get("me/last-practiced"),
            operation = "me.last-practiced",
            parseSuccess = { payload, op ->
                // BFF emits literal `null` when the user has no row yet.
                if (payload.isBlank() || payload.trim() == "null") {
                    null
                } else {
                    decode(LastPracticed.serializer(), payload, op)
                }
            },
        )

    override suspend fun putLastPracticed(entry: LastPracticed): LastPracticed =
        execute(
            request = jsonRequest(
                method = "PUT",
                path = "me/last-practiced",
                body = json.encodeToString(LastPracticed.serializer(), entry),
            ),
            operation = "me.last-practiced.put",
            parseSuccess = { payload, op -> decode(LastPracticed.serializer(), payload, op) },
        )

    override suspend fun bestScores(): Map<String, BestScoreEntry> =
        execute(
            request = get("me/best-scores"),
            operation = "me.best-scores",
            parseSuccess = { payload, op ->
                if (payload.isBlank()) {
                    emptyMap()
                } else {
                    decode(
                        MapSerializer(String.serializer(), BestScoreEntry.serializer()),
                        payload,
                        op,
                    )
                }
            },
        )

    override suspend fun putBestScore(
        surahId: String,
        ayahNumber: Int,
        entry: BestScoreEntry,
    ): BestScoreEntry {
        val key = "$surahId:$ayahNumber"
        return execute(
            request = jsonRequest(
                method = "PUT",
                path = "me/best-scores/$key",
                body = json.encodeToString(BestScoreEntry.serializer(), entry),
            ),
            operation = "me.best-scores.put",
            parseSuccess = { payload, op -> decode(BestScoreEntry.serializer(), payload, op) },
        )
    }

    override suspend fun attempts(limit: Int): List<Attempt> =
        execute(
            request = get("me/attempts?limit=$limit"),
            operation = "me.attempts",
            parseSuccess = { payload, op ->
                decode(AttemptsResponseBody.serializer(), payload, op).attempts
            },
        )

    override suspend fun recordAttempt(attempt: Attempt): Attempt =
        execute(
            request = jsonRequest(
                method = "POST",
                path = "me/attempts",
                body = json.encodeToString(AttemptPostBody.serializer(), attempt.toPostBody()),
            ),
            operation = "me.attempts.post",
            parseSuccess = { payload, op -> decode(Attempt.serializer(), payload, op) },
        )

    private fun get(path: String): Request = Request.Builder()
        .url("${baseUrl}$path")
        .header("Accept", "application/json")
        .get()
        .build()

    private fun jsonRequest(method: String, path: String, body: String): Request {
        val builder = Request.Builder()
            .url("${baseUrl}$path")
            .header("Accept", "application/json")
        val requestBody = body.toRequestBody(JSON_MEDIA)
        return when (method) {
            "PUT" -> builder.put(requestBody).build()
            "POST" -> builder.post(requestBody).build()
            else -> error("unsupported method: $method")
        }
    }

    private suspend fun <T> execute(
        request: Request,
        operation: String,
        parseSuccess: (payload: String, operation: String) -> T,
    ): T {
        val response = try {
            http.send(request)
        } catch (cause: AppError) {
            throw cause
        } catch (cause: IOException) {
            throw AppError.Network(cause)
        } catch (cause: Throwable) {
            throw AppError.BackendUnavailable(operation, cause)
        }
        return response.use { resp ->
            val payload = resp.body?.string().orEmpty()
            when (resp.code) {
                in 200..299 -> parseSuccess(payload, operation)
                400 -> throw AppError.ValidationFailed(parseErrorMessage(payload) ?: "invalid input")
                401 -> throw AppError.InvalidCredentials
                else -> throw AppError.BackendUnavailable(operation)
            }
        }
    }

    private fun <T> decode(
        serializer: kotlinx.serialization.KSerializer<T>,
        payload: String,
        operation: String,
    ): T = try {
        json.decodeFromString(serializer, payload)
    } catch (_: SerializationException) {
        throw AppError.BackendUnavailable("$operation.parse")
    }

    private fun parseErrorMessage(payload: String): String? = try {
        json.decodeFromString(AuthErrorDto.serializer(), payload).error
    } catch (_: SerializationException) {
        null
    }

    private fun Attempt.toPostBody(): AttemptPostBody = AttemptPostBody(
        surahId = surahId,
        surahNameEn = surahNameEn,
        ayahNumber = ayahNumber,
        score = score?.toInt(),
        jobId = jobId,
        status = status,
        durationMs = durationMs,
        // ISO 8601 matches `Attempt.createdAt`'s `InstantIsoSerializer`
        // round-trip — kept inline rather than re-serialising the
        // domain `Attempt` to avoid the `id` round-trip (the BFF assigns
        // a new id on POST).
        createdAt = createdAt.toString(),
    )

    private companion object {
        val JSON_MEDIA = "application/json; charset=utf-8".toMediaType()
    }
}

/** 2xx response shape for `GET /me/attempts`. */
@Serializable
internal data class AttemptsResponseBody(val attempts: List<Attempt>)

/**
 * Wire shape for `POST /me/attempts`. `id` is omitted because the BFF
 * issues a fresh one; `score` is an `Int?` so the BFF's zod
 * `z.number().int()` validator accepts it without decimal noise.
 */
@Serializable
internal data class AttemptPostBody(
    val surahId: String,
    val surahNameEn: String,
    val ayahNumber: Int,
    val score: Int?,
    val jobId: String,
    val status: AttemptStatus,
    val durationMs: Long?,
    val createdAt: String,
)

internal val HistoryRemoteJson: Json = Json {
    ignoreUnknownKeys = true
    encodeDefaults = false
    explicitNulls = false
}
