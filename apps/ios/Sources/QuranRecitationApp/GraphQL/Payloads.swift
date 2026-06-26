import Foundation

// Top-level aliases for the operations and types codegen places under
// the QuranSchema namespace. Keeps the rest of the app code unchanged.
public typealias GetSignedUploadUrlMutation = QuranSchema.GetSignedUploadUrlMutation
public typealias CreateScoringJobMutation = QuranSchema.CreateScoringJobMutation
public typealias ScoringJobQuery = QuranSchema.ScoringJobQuery
public typealias ScoringStatus = QuranSchema.ScoringStatus
public typealias SignedUploadInput = QuranSchema.SignedUploadInput
public typealias CreateScoringJobInput = QuranSchema.CreateScoringJobInput
public typealias GetSurahsQuery = QuranSchema.GetSurahsQuery
public typealias GetSurahQuery = QuranSchema.GetSurahQuery
public typealias GetAyahQuery = QuranSchema.GetAyahQuery

public struct SignedUploadPayload {
  public let uploadKey: String
  public let url: String
  public let expiresAt: String

  init(from data: GetSignedUploadUrlMutation.Data.GetSignedUploadUrl) {
    url = data.url
    expiresAt = data.expiresAt
    uploadKey = Self.derivedUploadKey(from: data.url)
  }

  /// Extract the object key the BFF stored in
  /// `user_data_objects.audio_key` from a presigned upload URL.
  ///
  /// The presigned URL path is `/<bucket>/<key…>`, so we drop the
  /// leading slash and the bucket segment and keep everything after
  /// it — including any prefix like `uploads/`. The earlier
  /// implementation used `URL.lastPathComponent`, which kept only the
  /// final filename and made `createScoringJob` fail with
  /// "Session ID not found for upload key" on S3-style deployments
  /// where the key contains slashes (Cloudflare R2 with
  /// `MINIO_UPLOAD_PREFIX=uploads/`). Mirrors the Android fix landed
  /// in PR #439.
  static func derivedUploadKey(from urlString: String) -> String {
    guard let path = URL(string: urlString)?.path else { return "" }
    let withoutLeadingSlash = path.hasPrefix("/") ? String(path.dropFirst()) : path
    guard let firstSlash = withoutLeadingSlash.firstIndex(of: "/") else {
      // Path has no further slashes after the bucket segment — there
      // is no key to extract.
      return ""
    }
    return String(withoutLeadingSlash[withoutLeadingSlash.index(after: firstSlash)...])
  }
}

public struct ScoreSegmentPayload {
  public let label: String
  public let score: Double

  init(from data: ScoringJobQuery.Data.ScoringJob.Segment) {
    label = data.label
    score = data.score
  }

  init(from data: CreateScoringJobMutation.Data.CreateScoringJob.Segment) {
    label = data.label
    score = data.score
  }
}

public struct WordAlignmentPayload: Hashable {
  public let refWord: String?
  public let hypWord: String?
  public let op: String

  public enum Operation: String {
    case match, sub, ins, del

    var fallback: Operation { .match }
  }

  public var operation: Operation {
    Operation(rawValue: op) ?? .match
  }
}

public struct PronunciationFeedbackPayload: Hashable {
  public let accuracy: Double
  public let completeness: Double
  public let overall: Double
  public let referenceAudioUrl: String?
  public let transcript: String?
  public let wer: Double?
  public let cer: Double?
  public let wordAlignments: [WordAlignmentPayload]
}

public struct ScoringResultPayload {
  public let jobId: String
  public let status: ScoringStatus
  public let score: Double?
  public let verdict: String?
  public let segments: [ScoreSegmentPayload]
  public let feedback: PronunciationFeedbackPayload?

  init(from data: CreateScoringJobMutation.Data.CreateScoringJob) {
    jobId = data.jobId
    status = data.status.value ?? .failed
    score = data.score
    verdict = data.verdict
    segments = data.segments.map { ScoreSegmentPayload(from: $0) }
    feedback = data.feedback.map { fb in
      PronunciationFeedbackPayload(
        accuracy: fb.accuracy,
        completeness: fb.completeness,
        overall: fb.overall,
        referenceAudioUrl: fb.referenceAudioUrl,
        transcript: fb.transcript,
        wer: fb.wer,
        cer: fb.cer,
        wordAlignments: fb.wordAlignments.map {
          WordAlignmentPayload(refWord: $0.refWord, hypWord: $0.hypWord, op: $0.op)
        }
      )
    }
  }

  init(from data: ScoringJobQuery.Data.ScoringJob) {
    jobId = data.jobId
    status = data.status.value ?? .failed
    score = data.score
    verdict = data.verdict
    segments = data.segments.map { ScoreSegmentPayload(from: $0) }
    feedback = data.feedback.map { fb in
      PronunciationFeedbackPayload(
        accuracy: fb.accuracy,
        completeness: fb.completeness,
        overall: fb.overall,
        referenceAudioUrl: fb.referenceAudioUrl,
        transcript: fb.transcript,
        wer: fb.wer,
        cer: fb.cer,
        wordAlignments: fb.wordAlignments.map {
          WordAlignmentPayload(refWord: $0.refWord, hypWord: $0.hypWord, op: $0.op)
        }
      )
    }
  }
}

// MARK: - Library / Practice DTOs

/// View-friendly surah summary used by the Library list and Continue
/// card. Initialised from either `GetSurahsQuery` (paginated list) or
/// `GetSurahQuery` (single).
public struct SurahSummary: Identifiable, Hashable {
  public let id: String
  public let nameAr: String
  public let nameEn: String
  public let ayahCount: Int
  public let revelationPlace: String

  init(id: String, nameAr: String, nameEn: String, ayahCount: Int, revelationPlace: String) {
    self.id = id
    self.nameAr = nameAr
    self.nameEn = nameEn
    self.ayahCount = ayahCount
    self.revelationPlace = revelationPlace
  }

  init(from data: GetSurahsQuery.Data.Surah) {
    self.init(
      id: data.id,
      nameAr: data.nameAr,
      nameEn: data.nameEn,
      ayahCount: data.ayahCount,
      revelationPlace: data.revelationPlace
    )
  }

  init(from data: GetSurahQuery.Data.Surah) {
    self.init(
      id: data.id,
      nameAr: data.nameAr,
      nameEn: data.nameEn,
      ayahCount: data.ayahCount,
      revelationPlace: data.revelationPlace
    )
  }
}

/// View-friendly single ayah used by the Practice screen.
public struct AyahDetail: Identifiable, Hashable {
  public let id: String
  public let surahId: String
  public let ayahNumber: Int
  public let textAr: String
  public let textEn: String?
  public let transliteration: String?

  init(
    id: String,
    surahId: String,
    ayahNumber: Int,
    textAr: String,
    textEn: String? = nil,
    transliteration: String? = nil
  ) {
    self.id = id
    self.surahId = surahId
    self.ayahNumber = ayahNumber
    self.textAr = textAr
    self.textEn = textEn
    self.transliteration = transliteration
  }

  init(from data: GetAyahQuery.Data.Ayah) {
    self.init(
      id: data.id,
      surahId: data.surahId,
      ayahNumber: data.ayahNumber,
      textAr: data.textAr,
      textEn: data.textEn,
      transliteration: data.transliteration
    )
  }
}
