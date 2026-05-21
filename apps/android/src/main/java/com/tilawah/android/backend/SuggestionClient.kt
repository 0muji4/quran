package com.tilawah.android.backend

import com.tilawah.android.app.AppConfig
import com.tilawah.android.app.AppError
import kotlinx.serialization.SerializationException
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.Request
import java.io.IOException

/**
 * REST client for `GET /me/suggestions` (ADR 0015). Returns a
 * personalised surah recommendation for the signed-in user plus a
 * sparse per-user difficulty map.
 *
 * Mirrors `apps/ios/Sources/QuranRecitationApp/Backend/MeClient.swift`
 * `suggestions()` slice. Errors cross this boundary as [AppError]
 * (ADR 0006).
 */
interface SuggestionClient {
    suspend fun suggestions(): SurahSuggestion
}

class HttpSuggestionClient(
    private val http: AuthedHttpClient,
    private val baseUrl: String = AppConfig.restBaseUrl,
    private val json: Json = SuggestionJson,
) : SuggestionClient {

    override suspend fun suggestions(): SurahSuggestion {
        val request = Request.Builder()
            .url("${baseUrl}me/suggestions")
            .header("Accept", "application/json")
            .get()
            .build()
        val response = try {
            http.send(request)
        } catch (cause: AppError) {
            throw cause
        } catch (cause: IOException) {
            throw AppError.Network(cause)
        } catch (cause: Throwable) {
            throw AppError.BackendUnavailable("me.suggestions", cause)
        }
        return response.use { resp ->
            val payload = resp.body?.string().orEmpty()
            when (resp.code) {
                in 200..299 -> parse(payload)
                401 -> throw AppError.InvalidCredentials
                else -> throw AppError.BackendUnavailable("me.suggestions")
            }
        }
    }

    private fun parse(payload: String): SurahSuggestion = try {
        val dto = json.decodeFromString(SuggestionResponseDto.serializer(), payload)
        SurahSuggestion(
            surahId = dto.suggested.surahId,
            reason = SuggestionReason.fromWire(dto.suggested.reason),
            difficulties = dto.difficulties.mapValues { (_, raw) -> Difficulty.fromWire(raw) },
        )
    } catch (_: SerializationException) {
        throw AppError.BackendUnavailable("me.suggestions.parse")
    }
}

/**
 * Personalised practice suggestion returned by `GET /me/suggestions`.
 *
 * `reason` is informational telemetry only — the View just displays
 * `surahId`. `difficulties` is a sparse map keyed by `surahId`; surahs
 * without entries fall back to the ayah-count heuristic in the View
 * layer, matching the web client's behaviour.
 */
data class SurahSuggestion(
    val surahId: String,
    val reason: SuggestionReason,
    val difficulties: Map<String, Difficulty>,
)

enum class SuggestionReason(val wire: String) {
    ShortUnpracticed("short_unpracticed"),
    ShortLowScore("short_low_score"),
    Fallback("fallback"),
    Unknown("unknown"),
    ;

    companion object {
        fun fromWire(value: String): SuggestionReason =
            entries.firstOrNull { it.wire == value } ?: Unknown
    }
}

enum class Difficulty(val wire: String) {
    Easy("easy"),
    Medium("medium"),
    Hard("hard"),
    ;

    companion object {
        fun fromWire(value: String): Difficulty =
            entries.firstOrNull { it.wire == value } ?: Medium
    }
}

/** Wire shape — mirrors `apps/bff/src/me/suggestions.ts`. */
@Serializable
internal data class SuggestionResponseDto(
    val suggested: SuggestedSurah,
    val difficulties: Map<String, String> = emptyMap(),
) {
    @Serializable
    data class SuggestedSurah(val surahId: String, val reason: String)
}

internal val SuggestionJson: Json = Json {
    ignoreUnknownKeys = true
    encodeDefaults = false
    explicitNulls = false
}
