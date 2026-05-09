import Foundation

/// Single async surface for everything the iOS app needs from the BFF.
/// View / ViewModel layers depend only on this protocol; production
/// uses `ApolloBackend`, tests inject a mock. The protocol exists so
/// (a) call sites never see Apollo, URLSession, or Apollo-specific
/// error types and (b) future transport changes (e.g. moving reference
/// audio from REST to GraphQL) are absorbed inside the implementation.
/// See ADR 0006.
protocol QuranBackend {
  /// Request a presigned upload URL for the given filename and MIME
  /// type. Throws `AppError.network` / `.backendUnavailable` on failure.
  func requestSignedUploadUrl(filename: String, contentType: String) async throws -> SignedUploadPayload

  /// Upload a local audio file to the supplied presigned URL via PUT.
  /// Throws `AppError.network` / `.backendUnavailable`.
  func uploadAudio(fileURL: URL, to signedUrl: String) async throws

  /// Submit a scoring job for a previously uploaded recording.
  /// `ayahNumber` is optional; when nil the BFF treats the upload as a
  /// surah-level recitation.
  func createScoringJob(uploadKey: String, surahId: String, ayahNumber: Int?) async throws -> ScoringResultPayload

  /// Poll the BFF until the job reaches a terminal status, or throw
  /// `AppError.scoringTimeout` after the implementation's retry budget
  /// is exhausted.
  func pollScoringResult(jobId: String) async throws -> ScoringResultPayload

  /// Fetch the surah list. `limit` and `offset` are optional; passing
  /// `nil` lets the BFF apply its own defaults.
  func surahs(limit: Int?, offset: Int?) async throws -> [SurahSummary]
}
