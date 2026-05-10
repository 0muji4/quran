package com.tilawah.android.backend

import com.apollographql.apollo.ApolloClient
import com.apollographql.apollo.api.Optional
import com.apollographql.apollo.exception.ApolloException
import com.apollographql.apollo.exception.ApolloHttpException
import com.apollographql.apollo.exception.ApolloNetworkException
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import com.tilawah.android.app.AppConfig
import com.tilawah.android.app.AppError
import com.tilawah.android.graphql.CreateScoringJobMutation
import com.tilawah.android.graphql.GetAyahQuery
import com.tilawah.android.graphql.GetScoringJobQuery
import com.tilawah.android.graphql.GetSignedUploadUrlMutation
import com.tilawah.android.graphql.GetSurahQuery
import com.tilawah.android.graphql.GetSurahWithAyahsQuery
import com.tilawah.android.graphql.GetSurahsQuery
import com.tilawah.android.graphql.type.CreateScoringJobInput
import com.tilawah.android.graphql.type.ScoringStatus as GqlScoringStatus
import com.tilawah.android.graphql.type.SignedUploadInput
import java.io.File
import java.io.IOException

/**
 * Production [QuranBackend] backed by Apollo Kotlin (GraphQL) plus a
 * thin OkHttp client for the S3-signed upload PUT and the REST
 * `/reference-audio` lookup. Mirrors iOS's `ApolloBackend`.
 *
 * Every native exception (Apollo / OkHttp / IO) is converted to an
 * [AppError] case at this boundary so ViewModels never reason about
 * transport types.
 */
class ApolloQuranBackend(
    private val apollo: ApolloClient = defaultApolloClient(),
    private val httpClient: OkHttpClient = OkHttpClient(),
    private val referenceAudio: ReferenceAudioClient = ReferenceAudioClient(httpClient),
) : QuranBackend {

    override suspend fun surahs(limit: Int?, offset: Int?): List<SurahSummary> =
        wrap("surahs") {
            val data = apollo
                .query(GetSurahsQuery(limit, offset))
                .execute()
                .dataOrThrow("surahs")
            data.surahs.map {
                SurahSummary(it.id, it.nameAr, it.nameEn, it.revelationPlace, it.ayahCount)
            }
        }

    override suspend fun surah(id: String): SurahSummary? = wrap("surah") {
        val data = apollo.query(GetSurahQuery(id)).execute().dataOrThrow("surah")
        data.surah?.let {
            SurahSummary(it.id, it.nameAr, it.nameEn, it.revelationPlace, it.ayahCount)
        }
    }

    override suspend fun ayah(surahId: String, ayahNumber: Int): AyahDetail? =
        wrap("ayah") {
            val data = apollo
                .query(GetAyahQuery(surahId, ayahNumber))
                .execute()
                .dataOrThrow("ayah")
            data.ayah?.let {
                AyahDetail(
                    it.id, it.surahId, it.ayahNumber, it.textAr, it.textEn, it.transliteration,
                )
            }
        }

    override suspend fun ayahs(surahId: String): List<AyahDetail> = wrap("ayahs") {
        val data = apollo
            .query(GetSurahWithAyahsQuery(surahId))
            .execute()
            .dataOrThrow("ayahs")
        data.surah?.ayahs.orEmpty().map {
            AyahDetail(
                it.id, it.surahId, it.ayahNumber, it.textAr, it.textEn, it.transliteration,
            )
        }
    }

    override suspend fun referenceAudio(surahId: String, ayah: Int): ReferenceAudio =
        referenceAudio.fetch(surahId, ayah)

    override suspend fun requestSignedUploadUrl(
        filename: String,
        contentType: String,
    ): SignedUploadPayload = wrap("requestSignedUploadUrl") {
        val data = apollo
            .mutation(GetSignedUploadUrlMutation(SignedUploadInput(filename, contentType)))
            .execute()
            .dataOrThrow("getSignedUploadUrl")
        val url = data.getSignedUploadUrl.url
        SignedUploadPayload(
            url = url,
            expiresAt = data.getSignedUploadUrl.expiresAt,
            uploadKey = derivedUploadKey(url),
        )
    }

    private fun derivedUploadKey(url: String): String =
        runCatching {
            java.net.URI(url).path?.trimStart('/')?.substringAfterLast('/').orEmpty()
        }.getOrDefault("")

    override suspend fun uploadAudio(file: File, signedUrl: String, contentType: String) =
        wrap("uploadAudio") {
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
        ayahNumber: Int?,
        sessionId: String?,
    ): ScoringResultPayload = wrap("createScoringJob") {
        val input = CreateScoringJobInput(
            surahId = surahId,
            ayahNumber = toOptional(ayahNumber),
            uploadKey = uploadKey,
        )
        val data = apollo
            .mutation(CreateScoringJobMutation(input))
            .execute()
            .dataOrThrow("createScoringJob")
        data.createScoringJob.toPayload()
    }

    override suspend fun fetchScoringJob(jobId: String): ScoringResultPayload =
        wrap("fetchScoringJob") {
            val data = apollo
                .query(GetScoringJobQuery(jobId))
                .execute()
                .dataOrThrow("scoringJob")
            data.scoringJob?.toPayload()
                ?: throw AppError.BackendUnavailable("fetchScoringJob")
        }

    // -- helpers -------------------------------------------------------

    private inline fun <T> wrap(operation: String, block: () -> T): T = try {
        block()
    } catch (cause: AppError) {
        throw cause
    } catch (cause: ApolloHttpException) {
        if (cause.statusCode == 503) {
            throw AppError.BackendUnavailable(operation)
        }
        throw AppError.BackendUnavailable(operation)
    } catch (cause: ApolloNetworkException) {
        throw AppError.Network(cause.cause ?: IOException(operation))
    } catch (cause: ApolloException) {
        throw AppError.BackendUnavailable(operation)
    } catch (cause: IOException) {
        throw AppError.Network(cause)
    } catch (cause: Throwable) {
        throw AppError.BackendUnavailable(operation)
    }

    private fun <D : com.apollographql.apollo.api.Operation.Data>
        com.apollographql.apollo.api.ApolloResponse<D>.dataOrThrow(operation: String): D =
        data ?: throw AppError.BackendUnavailable(operation)

    private fun CreateScoringJobMutation.CreateScoringJob.toPayload(): ScoringResultPayload =
        ScoringResultPayload(
            jobId = jobId,
            status = status.toFacade(),
            score = score,
            verdict = verdict,
            segments = segments.map { ScoreSegment(it.label, it.score) },
            feedback = feedback?.let { f ->
                PronunciationFeedback(
                    accuracy = f.accuracy,
                    fluency = f.fluency,
                    completeness = f.completeness,
                    overall = f.overall,
                    referenceAudioUrl = f.referenceAudioUrl,
                    transcript = f.transcript,
                    wer = f.wer,
                    wordAlignments = f.wordAlignments.map {
                        WordAlignment(it.refWord, it.hypWord, it.op)
                    },
                )
            },
        )

    private fun GetScoringJobQuery.ScoringJob.toPayload(): ScoringResultPayload =
        ScoringResultPayload(
            jobId = jobId,
            status = status.toFacade(),
            score = score,
            verdict = verdict,
            segments = segments.map { ScoreSegment(it.label, it.score) },
            feedback = feedback?.let { f ->
                PronunciationFeedback(
                    accuracy = f.accuracy,
                    fluency = f.fluency,
                    completeness = f.completeness,
                    overall = f.overall,
                    referenceAudioUrl = f.referenceAudioUrl,
                    transcript = f.transcript,
                    wer = f.wer,
                    wordAlignments = f.wordAlignments.map {
                        WordAlignment(it.refWord, it.hypWord, it.op)
                    },
                )
            },
        )

    private fun GqlScoringStatus.toFacade(): ScoringStatus = when (this) {
        GqlScoringStatus.QUEUED -> ScoringStatus.Queued
        GqlScoringStatus.RUNNING -> ScoringStatus.Running
        GqlScoringStatus.COMPLETED -> ScoringStatus.Completed
        GqlScoringStatus.FAILED -> ScoringStatus.Failed
        GqlScoringStatus.UNKNOWN__ -> ScoringStatus.Failed
    }

    private fun <T : Any> toOptional(value: T?): Optional<T> =
        if (value == null) Optional.absent() else Optional.present(value)

    private companion object {
        fun defaultApolloClient(): ApolloClient = ApolloClient.Builder()
            .serverUrl(AppConfig.graphqlUrl)
            .build()
    }
}
