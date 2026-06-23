package com.tilawah.android.backend

import com.tilawah.android.app.AppConfig
import com.tilawah.android.app.AppError
import kotlinx.serialization.SerializationException
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

/**
 * REST client for the signed-in user's practice preferences
 * (`GET` / `PATCH /me/preferences`).
 *
 * GET returns the whole row; the BFF substitutes column defaults when the
 * user has no row yet, so a caller always has values to render. PATCH is a
 * partial update — only the fields a single edit touches are sent (the
 * rest are dropped by [PreferencesJson]), and the merged row is echoed
 * back so a server-side normalisation becomes the source of truth.
 *
 * Kept as its own focused client rather than folded into [ProfileService]:
 * [ProfileService] fronts the unauthenticated-origin `/auth/me*` surface,
 * while this fronts the always-authenticated `/me` surface. Errors cross
 * this boundary as [AppError] (ADR 0006).
 */
interface PreferencesClient {
    suspend fun preferences(): PracticePreferences
    suspend fun updatePreferences(patch: PracticePreferencesPatch): PracticePreferences
}

class HttpPreferencesClient(
    private val http: AuthedHttpClient,
    private val baseUrl: String = AppConfig.restBaseUrl,
    private val json: Json = PreferencesJson,
) : PreferencesClient {

    override suspend fun preferences(): PracticePreferences =
        execute(
            request = Request.Builder()
                .url("${baseUrl}me/preferences")
                .header("Accept", "application/json")
                .get()
                .build(),
            operation = "me.preferences",
        )

    override suspend fun updatePreferences(patch: PracticePreferencesPatch): PracticePreferences {
        val body = json.encodeToString(PracticePreferencesPatch.serializer(), patch)
        return execute(
            request = Request.Builder()
                .url("${baseUrl}me/preferences")
                .header("Accept", "application/json")
                .patch(body.toRequestBody(JSON_MEDIA))
                .build(),
            operation = "me.preferences.patch",
        )
    }

    private suspend fun execute(request: Request, operation: String): PracticePreferences {
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
                in 200..299 -> parse(payload, operation)
                401 -> throw AppError.InvalidCredentials
                else -> throw AppError.BackendUnavailable(operation)
            }
        }
    }

    private fun parse(payload: String, operation: String): PracticePreferences = try {
        json.decodeFromString(PreferencesResponseDto.serializer(), payload).preferences
    } catch (_: SerializationException) {
        throw AppError.BackendUnavailable("$operation.parse")
    }

    private companion object {
        val JSON_MEDIA = "application/json; charset=utf-8".toMediaType()
    }
}

/**
 * Practice preferences from `/me/preferences`. Field names match the
 * server JSON so this round-trips without an adapter.
 */
@Serializable
data class PracticePreferences(
    val referenceReciterId: String,
    /** Decimal in the closed range [0.5, 2.0] (BFF validation + column CHECK). */
    val defaultPlaybackSpeed: Double,
    val dailyReminderEnabled: Boolean,
    /** 24-hour "HH:mm" — matches the BFF regex and the Postgres TIME column. */
    val dailyReminderTime: String,
) {
    companion object {
        /** Server-side column defaults; the optimistic baseline before the first GET. */
        val Default = PracticePreferences(
            referenceReciterId = "husary-muallim",
            defaultPlaybackSpeed = 1.0,
            dailyReminderEnabled = false,
            dailyReminderTime = "08:00",
        )
    }
}

/**
 * Partial update for `PATCH /me/preferences`. Null fields are dropped on
 * the wire by [PreferencesJson] so an unsent field never clobbers its
 * stored column (the BFF upserts only the columns that arrive).
 */
@Serializable
data class PracticePreferencesPatch(
    val referenceReciterId: String? = null,
    val defaultPlaybackSpeed: Double? = null,
    val dailyReminderEnabled: Boolean? = null,
    val dailyReminderTime: String? = null,
)

/** 2xx response shape for `GET` / `PATCH /me/preferences` — the row in an envelope. */
@Serializable
internal data class PreferencesResponseDto(val preferences: PracticePreferences)

internal val PreferencesJson: Json = Json {
    ignoreUnknownKeys = true
    encodeDefaults = false
    explicitNulls = false
}
