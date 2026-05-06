import Foundation

// Top-level aliases for the operations and types codegen places under
// the QuranSchema namespace. Keeps the rest of the app code unchanged.
public typealias GetSignedUploadUrlMutation = QuranSchema.GetSignedUploadUrlMutation
public typealias CreateScoringJobMutation = QuranSchema.CreateScoringJobMutation
public typealias ScoringJobQuery = QuranSchema.ScoringJobQuery
public typealias ScoringStatus = QuranSchema.ScoringStatus
public typealias SignedUploadInput = QuranSchema.SignedUploadInput
public typealias CreateScoringJobInput = QuranSchema.CreateScoringJobInput

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
    status = data.status
    score = data.score
    verdict = data.verdict
    segments = data.segments.map { ScoreSegmentPayload(from: $0) }
  }

  init(from data: ScoringJobQuery.Data.ScoringJob) {
    jobId = data.jobId
    status = data.status
    score = data.score
    verdict = data.verdict
    segments = data.segments.map { ScoreSegmentPayload(from: $0) }
  }
}
