package tv.every.tilawah.android.network.model

import com.google.gson.JsonObject
import com.google.gson.annotations.SerializedName

data class SignedUploadRequest(
    val filename: String,
    val contentType: String
)

data class SignedUploadResponse(
    val url: String,
    val expiresAt: String,
    val fields: JsonObject?,
    val uploadKey: String?,
    val sessionId: String?
)

data class CreateScoringJobRequest(
    val sessionId: String?,
    val uploadKey: String,
    val surahId: String,
    val ayahNumber: Int
)

data class SurahsResponse(
    val surahs: List<SurahSummary>
)

data class AyahsResponse(
    val ayahs: List<AyahRecord>
)

data class SurahSummary(
    val id: String,
    val nameAr: String,
    val nameEn: String,
    val ayahCount: Int,
    val revelationPlace: String
)

data class AyahRecord(
    val id: String,
    val surahId: String,
    val ayahNumber: Int,
    val textAr: String,
    val textEn: String?,
    val transliteration: String?
)

enum class ScoringStatus {
    @SerializedName("COMPLETED")
    COMPLETED,
    @SerializedName("FAILED")
    FAILED,
    @SerializedName("QUEUED")
    QUEUED,
    @SerializedName("RUNNING")
    RUNNING
}

data class ScoreSegment(
    val label: String,
    val metrics: JsonObject?,
    val score: Double
)

data class WordAlignment(
    val hypWord: String?,
    val op: String,
    val refWord: String?
)

data class PronunciationFeedback(
    val accuracy: Double,
    val completeness: Double,
    val fluency: Double,
    val overall: Double,
    val referenceAudioUrl: String?,
    val wordAlignments: List<WordAlignment>,
    val transcript: String?,
    val wer: Double?
)

data class ScoringResult(
    val createdAt: String,
    val evaluation: JsonObject?,
    val feedback: PronunciationFeedback?,
    val jobId: String,
    val score: Double?,
    val segments: List<ScoreSegment>,
    val status: ScoringStatus,
    val uploadKey: String,
    val verdict: String?
)
