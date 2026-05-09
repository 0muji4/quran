import Foundation
@testable import QuranRecitationApp

/// Configurable `QuranBackend` test double. Each method returns the
/// corresponding `Result` field, defaulting to a successful empty
/// payload. Tests override only the methods they exercise.
final class MockBackend: QuranBackend {
  var signedUploadResult: Result<SignedUploadPayload, AppError>?
  var uploadResult: Result<Void, AppError> = .success(())
  var createScoringJobResult: Result<ScoringResultPayload, AppError>?
  var pollScoringResult: Result<ScoringResultPayload, AppError>?
  var surahsResult: Result<[SurahSummary], AppError> = .success([])

  init(
    signedUploadResult: Result<SignedUploadPayload, AppError>? = nil,
    createScoringJobResult: Result<ScoringResultPayload, AppError>? = nil,
    pollScoringResult: Result<ScoringResultPayload, AppError>? = nil,
    surahsResult: Result<[SurahSummary], AppError> = .success([])
  ) {
    self.signedUploadResult = signedUploadResult
    self.createScoringJobResult = createScoringJobResult
    self.pollScoringResult = pollScoringResult
    self.surahsResult = surahsResult
  }

  func requestSignedUploadUrl(filename: String, contentType: String) async throws -> SignedUploadPayload {
    try Self.unwrap(signedUploadResult, fallback: .scoringTimeout)
  }

  func uploadAudio(fileURL: URL, to signedUrl: String) async throws {
    try Self.unwrap(uploadResult, fallback: .scoringTimeout)
  }

  func createScoringJob(uploadKey: String, surahId: String, ayahNumber: Int?) async throws -> ScoringResultPayload {
    try Self.unwrap(createScoringJobResult, fallback: .scoringTimeout)
  }

  func pollScoringResult(jobId: String) async throws -> ScoringResultPayload {
    try Self.unwrap(pollScoringResult, fallback: .scoringTimeout)
  }

  func surahs(limit: Int?, offset: Int?) async throws -> [SurahSummary] {
    switch surahsResult {
    case .success(let value): return value
    case .failure(let error): throw error
    }
  }

  // MARK: - Practice lookups (PR 12)

  /// Closure-based lookup so tests can vary behaviour per id without
  /// stuffing every fixture into a `Result`. Throws fall through to
  /// the caller untouched.
  var surahLookup: ((String) async throws -> SurahSummary?)?
  var ayahLookup: ((String, Int) async throws -> AyahDetail?)?

  func surah(id: String) async throws -> SurahSummary? {
    if let surahLookup { return try await surahLookup(id) }
    return nil
  }

  func ayah(surahId: String, ayahNumber: Int) async throws -> AyahDetail? {
    if let ayahLookup { return try await ayahLookup(surahId, ayahNumber) }
    return nil
  }

  private static func unwrap<T>(_ result: Result<T, AppError>?, fallback: AppError) throws -> T {
    guard let result else { throw fallback }
    switch result {
    case .success(let value): return value
    case .failure(let error): throw error
    }
  }
}
