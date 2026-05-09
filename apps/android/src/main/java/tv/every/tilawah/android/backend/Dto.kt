package tv.every.tilawah.android.backend

/**
 * Facade DTOs that the View / ViewModel layer consumes. Apollo Kotlin
 * generates its own data classes under the
 * `tv.every.tilawah.android.graphql` package; [ApolloQuranBackend]
 * converts those generated types to these stable shapes so the schema
 * can evolve (and the transport can swap to a different GraphQL
 * client) without churning every call site.
 *
 * Field names match `apps/web/app/lib/storage.ts` and
 * `apps/ios/.../Backend/` to keep cross-platform analytics + history
 * comparisons clean.
 */

data class SurahSummary(
    val id: String,
    val nameAr: String,
    val nameEn: String,
    val revelationPlace: String,
    val ayahCount: Int,
)

data class AyahDetail(
    val id: String,
    val surahId: String,
    val ayahNumber: Int,
    val textAr: String,
    val textEn: String?,
    val transliteration: String?,
)

data class ReferenceAudio(
    val signedUrl: String,
    val expiresAt: String,
)

data class SignedUploadPayload(
    val url: String,
    val expiresAt: String,
    /**
     * Derived from the URL's last path component (e.g. an S3 key).
     * Mirrors `apps/ios/.../GraphQL/Payloads.swift` behaviour where
     * `uploadKey = URL(string: data.url)?.lastPathComponent`. Empty
     * if the URL cannot be parsed.
     */
    val uploadKey: String,
)

enum class ScoringStatus {
    Queued,
    Running,
    Completed,
    Failed,
}

data class WordAlignment(
    val refWord: String?,
    val hypWord: String?,
    val op: String,
)

data class PronunciationFeedback(
    val accuracy: Double,
    val fluency: Double,
    val completeness: Double,
    val overall: Double,
    val referenceAudioUrl: String?,
    val transcript: String?,
    val wer: Double?,
    val wordAlignments: List<WordAlignment>,
)

data class ScoreSegment(
    val label: String,
    val score: Double,
)

data class ScoringResultPayload(
    val jobId: String,
    val status: ScoringStatus,
    val score: Double?,
    val verdict: String?,
    val segments: List<ScoreSegment>,
    val feedback: PronunciationFeedback?,
)
