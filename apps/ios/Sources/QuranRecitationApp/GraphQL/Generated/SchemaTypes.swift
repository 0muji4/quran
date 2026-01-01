import ApolloAPI
import Foundation

public enum QuranSchema: SchemaMetadata {
  public static let namespace: String = "QuranSchema"

  public enum Objects {
    public static let Mutation = Object(typename: "Mutation", implementedInterfaces: [])
    public static let Query = Object(typename: "Query", implementedInterfaces: [])
    public static let SignedUploadUrl = Object(typename: "SignedUploadUrl", implementedInterfaces: [])
    public static let ScoringResult = Object(typename: "ScoringResult", implementedInterfaces: [])
    public static let ScoreSegment = Object(typename: "ScoreSegment", implementedInterfaces: [])
  }
}

public struct SignedUploadInput: InputObject {
  public static let _typeName: String = "SignedUploadInput"
  public private(set) var __data: InputDict

  public init(filename: String, contentType: String) {
    __data = InputDict(["filename": filename, "contentType": contentType])
  }
}

public struct CreateScoringJobInput: InputObject {
  public static let _typeName: String = "CreateScoringJobInput"
  public private(set) var __data: InputDict

  public init(surahId: String, ayahNumber: Int?, uploadKey: String) {
    __data = InputDict([
      "surahId": surahId,
      "ayahNumber": ayahNumber,
      "uploadKey": uploadKey
    ])
  }
}

public enum ScoringStatus: String, EnumType {
  case queued = "QUEUED"
  case running = "RUNNING"
  case completed = "COMPLETED"
  case failed = "FAILED"
}

public struct SignedUploadPayload {
  public let uploadKey: String
  public let url: String

  init(from data: GetSignedUploadUrlMutation.Data.GetSignedUploadUrl) {
    url = data.url
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
