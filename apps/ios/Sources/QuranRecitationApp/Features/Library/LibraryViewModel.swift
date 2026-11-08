import Combine
import Foundation
import SwiftUI

/// State container for the Library tab. Holds the loaded surah list,
/// the user's free-text search query, and the active difficulty filter,
/// and exposes a `filteredSurahs` view derived from all three. The
/// Continue-card behaviour lands in PR 11.
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

  /// Difficulty / origin filter shown as the bottom row of chips.
  /// `.all` is the default (no filter). The other cases group surahs by
  /// revelation place + length so users can warm up on shorter Meccan
  /// surahs before tackling longer Medinan ones.
  enum Filter: Hashable {
    case all
    case mecca
    case medina
    case short
  }

  @Published private(set) var state: LoadState = .idle
  @Published var query: String = ""
  @Published var filter: Filter = .all
  @Published private(set) var lastPracticed: LastPracticed?
  /// Best score per surah on a 0–100 scale, keyed by surah id.
  @Published private(set) var bestScores: [String: Int] = [:]

  private let backend: QuranBackend
  private let telemetry: Telemetry
  private let historyStore: HistoryStore

  /// Surahs of "Al-Ikhlas" length or shorter. Used by `.short` filter.
  private static let shortAyahCutoff = 20

  init(backend: QuranBackend, telemetry: Telemetry, historyStore: HistoryStore) {
    self.backend = backend
    self.telemetry = telemetry
    self.historyStore = historyStore
    reloadHistory()
  }

  var historyChanges: AnyPublisher<Void, Never> { historyStore.changes }

  func reloadHistory() {
    lastPracticed = historyStore.lastPracticed()
    bestScores = historyStore.bestScoresBySurah()
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

  func continueTapped(_ entry: LastPracticed) {
    telemetry.event(
      "library.continue.tapped",
      attributes: [
        "surah_id": entry.surahId,
        "ayah_number": String(entry.ayahNumber)
      ]
    )
  }

  /// Surahs visible to the View after applying the search query and
  /// chip filter. Returns an empty array unless the load state is
  /// `.loaded`. Search matches both English and Arabic names case-
  /// insensitively.
  var filteredSurahs: [SurahSummary] {
    guard case let .loaded(items) = state else { return [] }
    return items
      .filter(matchesFilter)
      .filter(matchesQuery)
  }

  private func matchesFilter(_ surah: SurahSummary) -> Bool {
    switch filter {
    case .all:    return true
    case .mecca:  return surah.revelationPlace.lowercased() == "mecca"
    case .medina: return surah.revelationPlace.lowercased() == "medina"
    case .short:  return surah.ayahCount <= Self.shortAyahCutoff
    }
  }

  private func matchesQuery(_ surah: SurahSummary) -> Bool {
    let trimmed = query.trimmingCharacters(in: .whitespaces)
    guard !trimmed.isEmpty else { return true }
    return surah.nameEn.localizedCaseInsensitiveContains(trimmed)
      || surah.nameAr.localizedCaseInsensitiveContains(trimmed)
  }
}
