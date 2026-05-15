import Foundation
@testable import QuranRecitationApp

/// Configurable `MeClient` test double. Returns the configured
/// `Result` on each call (defaulting to `.backendUnavailable` when
/// unset) and records call counts so tests can assert the View only
/// fetches once per sign-in / appearance cycle.
@MainActor
final class MockMeClient: MeClient {
  var suggestionsResult: Result<SurahSuggestion, AppError>?

  private(set) var suggestionsCallCount = 0

  init(suggestionsResult: Result<SurahSuggestion, AppError>? = nil) {
    self.suggestionsResult = suggestionsResult
  }

  func suggestions() async throws -> SurahSuggestion {
    suggestionsCallCount += 1
    guard let result = suggestionsResult else {
      throw AppError.backendUnavailable(operation: "mock.me.suggestions")
    }
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
