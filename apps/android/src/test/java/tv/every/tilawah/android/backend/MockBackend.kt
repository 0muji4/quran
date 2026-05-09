package tv.every.tilawah.android.backend

import tv.every.tilawah.android.app.AppError
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
    var surahLookup: (String) -> Result<SurahSummary?> = { Result.success(null) },
    var ayahLookup: (String, Int) -> Result<AyahDetail?> = { _, _ -> Result.success(null) },
    var ayahsResult: (String) -> Result<List<AyahDetail>> = { Result.success(emptyList()) },
    var referenceAudioResult: (String, Int) -> Result<ReferenceAudio> = { surahId, ayah ->
        Result.failure(AppError.ReferenceUnavailable(surahId, ayah))
    },
    var signedUploadResult: Result<SignedUploadPayload> = Result.failure(
        AppError.BackendUnavailable("requestSignedUploadUrl"),
    ),
    var uploadResult: Result<Unit> = Result.success(Unit),
    var createScoringJobResult: Result<ScoringResultPayload> = Result.failure(
        AppError.BackendUnavailable("createScoringJob"),
    ),
    var fetchScoringJobResult: (String) -> Result<ScoringResultPayload> = {
        Result.failure(AppError.ScoringTimeout)
    },
) : QuranBackend {

    val callLog: MutableList<String> = mutableListOf()

    override suspend fun surahs(limit: Int?, offset: Int?): List<SurahSummary> {
        callLog += "surahs"
        return surahsResult.getOrThrow()
    }

    override suspend fun surah(id: String): SurahSummary? {
        callLog += "surah($id)"
        return surahLookup(id).getOrThrow()
    }

    override suspend fun ayah(surahId: String, ayahNumber: Int): AyahDetail? {
        callLog += "ayah($surahId, $ayahNumber)"
        return ayahLookup(surahId, ayahNumber).getOrThrow()
    }

    override suspend fun ayahs(surahId: String): List<AyahDetail> {
        callLog += "ayahs($surahId)"
        return ayahsResult(surahId).getOrThrow()
    }

    override suspend fun referenceAudio(surahId: String, ayah: Int): ReferenceAudio {
        callLog += "referenceAudio($surahId, $ayah)"
        return referenceAudioResult(surahId, ayah).getOrThrow()
    }

    override suspend fun requestSignedUploadUrl(
        filename: String,
        contentType: String,
    ): SignedUploadPayload {
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
        ayahNumber: Int?,
        sessionId: String?,
    ): ScoringResultPayload {
        callLog += "createScoringJob($surahId, $ayahNumber)"
        return createScoringJobResult.getOrThrow()
    }

    override suspend fun fetchScoringJob(jobId: String): ScoringResultPayload {
        callLog += "fetchScoringJob($jobId)"
        return fetchScoringJobResult(jobId).getOrThrow()
    }
}

/** Convenience builder for a "completed" ScoringResult fixture. */
fun completedScoringResult(
    jobId: String = "job-1",
    score: Double = 0.84,
): ScoringResultPayload = ScoringResultPayload(
    jobId = jobId,
    status = ScoringStatus.Completed,
    score = score,
    verdict = "Mashallah",
    segments = emptyList(),
    feedback = null,
)
