package com.quran.android.backend

import java.io.File

/**
 * Backend facade. Hides the transport (Apollo Kotlin / OkHttp) from
 * the View / ViewModel layer; every implementation throws only
 * [com.quran.android.app.AppError] across this seam.
 *
 * Mirrors `apps/ios/.../Backend/QuranBackend.swift`. See ADR 0006.
 */
interface QuranBackend {

    suspend fun surahs(limit: Int? = null, offset: Int? = null): List<SurahSummary>

    suspend fun surah(id: String): SurahSummary?

    suspend fun ayah(surahId: String, ayahNumber: Int): AyahDetail?

    /**
     * Fetch every ayah of a surah. Used by the legacy MVP picker; the
     * design-aligned Practice flow consumes [ayah] one at a time.
     */
    suspend fun ayahs(surahId: String): List<AyahDetail>

    /** REST `GET /reference-audio?surah=N&ayah=M`. */
    suspend fun referenceAudio(surahId: String, ayah: Int): ReferenceAudio

    suspend fun requestSignedUploadUrl(
        filename: String,
        contentType: String,
    ): SignedUploadPayload

    /** PUT the local recording to the S3-signed URL. */
    suspend fun uploadAudio(file: File, signedUrl: String, contentType: String)

    suspend fun createScoringJob(
        uploadKey: String,
        surahId: String,
        ayahNumber: Int?,
        sessionId: String? = null,
    ): ScoringResultPayload

    suspend fun fetchScoringJob(jobId: String): ScoringResultPayload
}
