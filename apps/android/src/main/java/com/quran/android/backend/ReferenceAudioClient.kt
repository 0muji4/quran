package com.quran.android.backend

import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import com.quran.android.app.AppConfig
import com.quran.android.app.AppError
import java.io.IOException

/**
 * Tiny REST client for `GET /reference-audio?surah=N&ayah=M`. The
 * GraphQL schema does not yet expose teacher-reference audio, so this
 * lives as a sibling of [ApolloQuranBackend] and is composed into the
 * facade. See `apps/bff/src/rest/rest.ts`.
 */
class ReferenceAudioClient(
    private val httpClient: OkHttpClient = OkHttpClient(),
    private val baseUrl: String = AppConfig.restBaseUrl,
) {
    suspend fun fetch(surahId: String, ayah: Int): ReferenceAudio {
        val url = "$baseUrl" + "reference-audio?surah=$surahId&ayah=$ayah"
        val request = Request.Builder().url(url).get().build()
        return try {
            httpClient.newCall(request).execute().use { response ->
                when (response.code) {
                    503 -> throw AppError.ReferenceUnavailable(surahId, ayah)
                    in 200..299 -> {
                        val body = response.body?.string()
                            ?: throw AppError.BackendUnavailable("reference-audio")
                        val json = JSONObject(body)
                        ReferenceAudio(
                            signedUrl = json.getString("url"),
                            expiresAt = json.getString("expiresAt"),
                        )
                    }
                    else -> throw AppError.BackendUnavailable("reference-audio")
                }
            }
        } catch (cause: AppError) {
            throw cause
        } catch (cause: IOException) {
            throw AppError.Network(cause)
        } catch (cause: Throwable) {
            throw AppError.BackendUnavailable("reference-audio")
        }
    }
}
