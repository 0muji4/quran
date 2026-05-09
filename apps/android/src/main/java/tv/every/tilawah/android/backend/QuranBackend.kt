package tv.every.tilawah.android.backend

import tv.every.tilawah.android.network.model.AyahRecord
import tv.every.tilawah.android.network.model.ScoringResult
import tv.every.tilawah.android.network.model.SignedUploadResponse
import tv.every.tilawah.android.network.model.SurahSummary
import java.io.File

/**
 * Backend facade. Hides the transport (Retrofit / Apollo / OkHttp)
 * from the View / ViewModel layer; every implementation throws only
 * [tv.every.tilawah.android.app.AppError] across this seam.
 *
 * This is the "Retrofit holdover" interface introduced before the
 * Apollo Kotlin migration (PR 7). The facade DTOs reuse the existing
 * `network/model` types for now; PR 7 introduces the Apollo-aligned
 * `backend/Dto.kt` and refactors callers in one diff.
 *
 * Mirrors `apps/ios/.../Backend/QuranBackend.swift`. See ADR 0006.
 */
interface QuranBackend {
    suspend fun surahs(): List<SurahSummary>

    suspend fun ayahs(surahId: String): List<AyahRecord>

    suspend fun requestSignedUploadUrl(
        filename: String,
        contentType: String,
    ): SignedUploadResponse

    suspend fun uploadAudio(file: File, signedUrl: String, contentType: String)

    suspend fun createScoringJob(
        uploadKey: String,
        surahId: String,
        ayahNumber: Int,
        sessionId: String?,
    ): ScoringResult

    suspend fun fetchScoringJob(jobId: String): ScoringResult
}
