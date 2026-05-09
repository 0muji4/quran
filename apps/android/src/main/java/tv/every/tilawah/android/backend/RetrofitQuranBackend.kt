package tv.every.tilawah.android.backend

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import tv.every.tilawah.android.app.AppError
import tv.every.tilawah.android.network.ApiClient
import tv.every.tilawah.android.network.ApiService
import tv.every.tilawah.android.network.awaitBody
import tv.every.tilawah.android.network.model.AyahRecord
import tv.every.tilawah.android.network.model.CreateScoringJobRequest
import tv.every.tilawah.android.network.model.ScoringResult
import tv.every.tilawah.android.network.model.SignedUploadRequest
import tv.every.tilawah.android.network.model.SignedUploadResponse
import tv.every.tilawah.android.network.model.SurahSummary
import java.io.File
import java.io.IOException

/**
 * Production [QuranBackend] backed by the existing Retrofit
 * `ApiService` + an OkHttp client for the S3-signed PUT upload.
 *
 * Every native exception (Retrofit / OkHttp / IO) is converted to an
 * [AppError] case at this boundary so ViewModels never reason about
 * transport types. Replaced by `ApolloQuranBackend` in PR 7.
 */
class RetrofitQuranBackend(
    private val api: ApiService = ApiClient.service,
    private val httpClient: OkHttpClient = OkHttpClient(),
) : QuranBackend {

    override suspend fun surahs(): List<SurahSummary> = mapErrors("surahs") {
        api.fetchSurahs().awaitBody().surahs
    }

    override suspend fun ayahs(surahId: String): List<AyahRecord> = mapErrors("ayahs") {
        api.fetchSurahAyahs(surahId).awaitBody().ayahs
    }

    override suspend fun requestSignedUploadUrl(
        filename: String,
        contentType: String,
    ): SignedUploadResponse = mapErrors("requestSignedUploadUrl") {
        api.requestSignedUploadUrl(SignedUploadRequest(filename, contentType)).awaitBody()
    }

    override suspend fun uploadAudio(file: File, signedUrl: String, contentType: String) =
        mapErrors("uploadAudio") {
            val request = Request.Builder()
                .url(signedUrl)
                .put(file.asRequestBody(contentType.toMediaType()))
                .build()
            httpClient.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    throw IllegalStateException("upload failed status=${response.code}")
                }
            }
        }

    override suspend fun createScoringJob(
        uploadKey: String,
        surahId: String,
        ayahNumber: Int,
        sessionId: String?,
    ): ScoringResult = mapErrors("createScoringJob") {
        api.createScoringJob(
            CreateScoringJobRequest(
                sessionId = sessionId,
                uploadKey = uploadKey,
                surahId = surahId,
                ayahNumber = ayahNumber,
            ),
        ).awaitBody()
    }

    override suspend fun fetchScoringJob(jobId: String): ScoringResult =
        mapErrors("fetchScoringJob") { api.fetchScoringJob(jobId).awaitBody() }

    private inline fun <T> mapErrors(operation: String, block: () -> T): T = try {
        block()
    } catch (cause: AppError) {
        throw cause
    } catch (cause: IOException) {
        throw AppError.Network(cause)
    } catch (cause: IllegalStateException) {
        throw AppError.BackendUnavailable(operation)
    } catch (cause: Throwable) {
        throw AppError.BackendUnavailable(operation)
    }
}
