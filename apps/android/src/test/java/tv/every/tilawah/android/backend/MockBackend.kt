package tv.every.tilawah.android.backend

import tv.every.tilawah.android.app.AppError
import tv.every.tilawah.android.network.model.AyahRecord
import tv.every.tilawah.android.network.model.ScoringResult
import tv.every.tilawah.android.network.model.ScoringStatus
import tv.every.tilawah.android.network.model.SignedUploadResponse
import tv.every.tilawah.android.network.model.SurahSummary
import java.io.File

/**
 * Test double for [QuranBackend]. Each method returns a per-call
 * configurable [Result]; closure-based lookups for surahs / ayahs let
 * tests describe a virtual catalogue without arranging full lists.
 *
 * Mirrors `apps/ios/Tests/QuranRecitationAppTests/MockBackend.swift`.
 */
class MockBackend(
    var surahsResult: Result<List<SurahSummary>> = Result.success(emptyList()),
    var ayahsResult: (String) -> Result<List<AyahRecord>> = { Result.success(emptyList()) },
    var signedUploadResult: Result<SignedUploadResponse> = Result.failure(
        AppError.BackendUnavailable("requestSignedUploadUrl"),
    ),
    var uploadResult: Result<Unit> = Result.success(Unit),
    var createScoringJobResult: Result<ScoringResult> = Result.failure(
        AppError.BackendUnavailable("createScoringJob"),
    ),
    var fetchScoringJobResult: (String) -> Result<ScoringResult> = {
        Result.failure(AppError.ScoringTimeout)
    },
) : QuranBackend {

    val callLog: MutableList<String> = mutableListOf()

    override suspend fun surahs(): List<SurahSummary> {
        callLog += "surahs"
        return surahsResult.getOrThrow()
    }

    override suspend fun ayahs(surahId: String): List<AyahRecord> {
        callLog += "ayahs($surahId)"
        return ayahsResult(surahId).getOrThrow()
    }

    override suspend fun requestSignedUploadUrl(
        filename: String,
        contentType: String,
    ): SignedUploadResponse {
        callLog += "requestSignedUploadUrl($filename, $contentType)"
        return signedUploadResult.getOrThrow()
    }

    override suspend fun uploadAudio(file: File, signedUrl: String, contentType: String) {
        callLog += "uploadAudio($signedUrl)"
        uploadResult.getOrThrow()
    }

    override suspend fun createScoringJob(
        uploadKey: String,
        surahId: String,
        ayahNumber: Int,
        sessionId: String?,
    ): ScoringResult {
        callLog += "createScoringJob($surahId, $ayahNumber)"
        return createScoringJobResult.getOrThrow()
    }

    override suspend fun fetchScoringJob(jobId: String): ScoringResult {
        callLog += "fetchScoringJob($jobId)"
        return fetchScoringJobResult(jobId).getOrThrow()
    }
}

/** Convenience builder for a "completed" ScoringResult fixture. */
fun completedScoringResult(
    jobId: String = "job-1",
    score: Double = 0.84,
): ScoringResult = ScoringResult(
    createdAt = "2026-05-09T13:00:00Z",
    evaluation = null,
    feedback = null,
    jobId = jobId,
    score = score,
    segments = emptyList(),
    status = ScoringStatus.COMPLETED,
    uploadKey = "uploads/$jobId.m4a",
    verdict = "Mashallah",
)
