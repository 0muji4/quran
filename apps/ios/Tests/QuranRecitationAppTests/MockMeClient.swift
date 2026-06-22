import Foundation
@testable import QuranRecitationApp

/// Configurable `MeClient` test double. Each method returns the
/// configured `Result`, defaulting to a `.backendUnavailable` failure
/// when unset, and records call counts plus the most-recent input so
/// tests can assert on the request shape.
@MainActor
final class MockMeClient: MeClient {
  var suggestionsResult: Result<SurahSuggestion, AppError>?
  var lastPracticedResult: Result<LastPracticed?, AppError>?
  var putLastPracticedResult: Result<LastPracticed, AppError>?
  var bestScoresResult: Result<[String: BestScoreEntry], AppError>?
  var putBestScoreResult: Result<BestScoreEntry, AppError>?
  var attemptsResult: Result<[Attempt], AppError>?
  var recordAttemptResult: Result<Attempt, AppError>?
  var preferencesResult: Result<PracticePreferences, AppError>?
  var updatePreferencesResult: Result<PracticePreferences, AppError>?

  private(set) var suggestionsCallCount = 0
  private(set) var lastPracticedCallCount = 0
  private(set) var putLastPracticedCallCount = 0
  private(set) var bestScoresCallCount = 0
  private(set) var putBestScoreCallCount = 0
  private(set) var attemptsCallCount = 0
  private(set) var recordAttemptCallCount = 0
  private(set) var preferencesCallCount = 0
  private(set) var updatePreferencesCallCount = 0

  private(set) var lastPutLastPracticed: LastPracticed?
  private(set) var lastPutBestScoreKey: String?
  private(set) var lastPutBestScoreEntry: BestScoreEntry?
  private(set) var lastRecordedAttempt: Attempt?
  private(set) var lastAttemptsLimit: Int?
  private(set) var lastPreferencesPatch: PracticePreferencesPatch?

  init(
    suggestionsResult: Result<SurahSuggestion, AppError>? = nil,
    lastPracticedResult: Result<LastPracticed?, AppError>? = nil,
    putLastPracticedResult: Result<LastPracticed, AppError>? = nil,
    bestScoresResult: Result<[String: BestScoreEntry], AppError>? = nil,
    putBestScoreResult: Result<BestScoreEntry, AppError>? = nil,
    attemptsResult: Result<[Attempt], AppError>? = nil,
    recordAttemptResult: Result<Attempt, AppError>? = nil
  ) {
    self.suggestionsResult = suggestionsResult
    self.lastPracticedResult = lastPracticedResult
    self.putLastPracticedResult = putLastPracticedResult
    self.bestScoresResult = bestScoresResult
    self.putBestScoreResult = putBestScoreResult
    self.attemptsResult = attemptsResult
    self.recordAttemptResult = recordAttemptResult
  }

  func suggestions() async throws -> SurahSuggestion {
    suggestionsCallCount += 1
    return try Self.unwrap(suggestionsResult, operation: "mock.me.suggestions")
  }

  func lastPracticed() async throws -> LastPracticed? {
    lastPracticedCallCount += 1
    return try Self.unwrap(lastPracticedResult, operation: "mock.me.lastPracticed")
  }

  func putLastPracticed(_ entry: LastPracticed) async throws -> LastPracticed {
    putLastPracticedCallCount += 1
    lastPutLastPracticed = entry
    return try Self.unwrap(putLastPracticedResult, operation: "mock.me.putLastPracticed")
  }

  func bestScores() async throws -> [String: BestScoreEntry] {
    bestScoresCallCount += 1
    return try Self.unwrap(bestScoresResult, operation: "mock.me.bestScores")
  }

  func putBestScore(
    surahId: String,
    ayahNumber: Int,
    entry: BestScoreEntry
  ) async throws -> BestScoreEntry {
    putBestScoreCallCount += 1
    lastPutBestScoreKey = "\(surahId):\(ayahNumber)"
    lastPutBestScoreEntry = entry
    return try Self.unwrap(putBestScoreResult, operation: "mock.me.putBestScore")
  }

  func attempts(limit: Int) async throws -> [Attempt] {
    attemptsCallCount += 1
    lastAttemptsLimit = limit
    return try Self.unwrap(attemptsResult, operation: "mock.me.attempts")
  }

  func recordAttempt(_ attempt: Attempt) async throws -> Attempt {
    recordAttemptCallCount += 1
    lastRecordedAttempt = attempt
    return try Self.unwrap(recordAttemptResult, operation: "mock.me.recordAttempt")
  }

  func preferences() async throws -> PracticePreferences {
    preferencesCallCount += 1
    return try Self.unwrap(preferencesResult, operation: "mock.me.preferences")
  }

  func updatePreferences(_ patch: PracticePreferencesPatch) async throws -> PracticePreferences {
    updatePreferencesCallCount += 1
    lastPreferencesPatch = patch
    return try Self.unwrap(updatePreferencesResult, operation: "mock.me.updatePreferences")
  }

  private static func unwrap<T>(_ result: Result<T, AppError>?, operation: String) throws -> T {
    guard let result else { throw AppError.backendUnavailable(operation: operation) }
    switch result {
    case .success(let value): return value
    case .failure(let error): throw error
    }
  }
}

extension SurahSuggestion {
  /// Convenience fixture matching the BFF's fallback response shape.
  static func fixture(
    surahId: String = "112",
    reason: SuggestionReason = .shortUnpracticed,
    difficulties: [String: Difficulty] = [:]
  ) -> SurahSuggestion {
    SurahSuggestion(surahId: surahId, reason: reason, difficulties: difficulties)
  }
}
