import Foundation
import SwiftUI

/// State container for the Library tab. Responsible only for fetching
/// the surah list and exposing a simple state enum that the View can
/// switch on. Filtering / search / Continue-card logic land in PR 10
/// and PR 11.
@MainActor
final class LibraryViewModel: ObservableObject {
  enum LoadState: Equatable {
    case idle
    case loading
    case loaded([SurahSummary])
    case failed(AppError)

    static func == (lhs: LoadState, rhs: LoadState) -> Bool {
      switch (lhs, rhs) {
      case (.idle, .idle), (.loading, .loading): return true
      case let (.loaded(a), .loaded(b)): return a == b
      case let (.failed(a), .failed(b)): return a.telemetryCode == b.telemetryCode
      default: return false
      }
    }
  }

  @Published private(set) var state: LoadState = .idle

  private let backend: QuranBackend
  private let telemetry: Telemetry

  init(backend: QuranBackend, telemetry: Telemetry) {
    self.backend = backend
    self.telemetry = telemetry
  }

  func load() async {
    state = .loading
    do {
      let surahs = try await telemetry.measure("library.fetch") {
        try await backend.surahs(limit: nil, offset: nil)
      }
      state = .loaded(surahs)
    } catch let error as AppError {
      telemetry.error(error, context: ["screen": "library"])
      state = .failed(error)
    } catch {
      let appError = AppError.network(underlying: error)
      telemetry.error(appError, context: ["screen": "library"])
      state = .failed(appError)
    }
  }

  func surahOpened(_ surah: SurahSummary) {
    telemetry.event(
      TelemetryEvent.librarySurahOpened,
      attributes: ["surah_id": surah.id]
    )
  }
}
