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
    uploadKey = URL(string: data.url)?.lastPathComponent ?? ""
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

public struct ScoringResultPayload {
  public let jobId: String
  public let status: ScoringStatus
  public let score: Double?
  public let verdict: String?
  public let segments: [ScoreSegmentPayload]

  init(from data: CreateScoringJobMutation.Data.CreateScoringJob) {
    jobId = data.jobId
    status = data.status.value ?? .failed
    score = data.score
    verdict = data.verdict
    segments = data.segments.map { ScoreSegmentPayload(from: $0) }
  }

  init(from data: ScoringJobQuery.Data.ScoringJob) {
    jobId = data.jobId
    status = data.status.value ?? .failed
    score = data.score
    verdict = data.verdict
    segments = data.segments.map { ScoreSegmentPayload(from: $0) }
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

  init(from data: GetAyahQuery.Data.Ayah) {
    self.id = data.id
    self.surahId = data.surahId
    self.ayahNumber = data.ayahNumber
    self.textAr = data.textAr
    self.textEn = data.textEn
    self.transliteration = data.transliteration
  }
}
