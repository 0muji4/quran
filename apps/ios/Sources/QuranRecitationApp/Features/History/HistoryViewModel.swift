import Foundation
import SwiftUI

/// State container for the History tab. Reads attempts from
/// `HistoryStore` and exposes a derived `filteredAttempts` for the
/// chip filter row. Stats grid (PR 23) reuses the same attempts array.
@MainActor
final class HistoryViewModel: ObservableObject {
  @Published private(set) var attempts: [Attempt] = []
  @Published var filter: Filter = .all

  enum Filter: Hashable {
    case all
    case surah(id: String, nameEn: String)
  }

  private let historyStore: HistoryStore
  private let telemetry: Telemetry

  init(historyStore: HistoryStore, telemetry: Telemetry) {
    self.historyStore = historyStore
    self.telemetry = telemetry
  }

  func reload() {
    attempts = historyStore.recentAttempts()
  }

  var filteredAttempts: [Attempt] {
    switch filter {
    case .all: return attempts
    case .surah(let id, _): return attempts.filter { $0.surahId == id }
    }
  }

  /// Distinct surah filters derived from history. Capped at 4 so the
  /// chip row doesn't overflow on narrow phones; the most recent
  /// surahs win.
  var filterOptions: [Filter] {
    var seen = Set<String>()
    var result: [Filter] = [.all]
    for attempt in attempts {
      if seen.insert(attempt.surahId).inserted {
        result.append(.surah(id: attempt.surahId, nameEn: attempt.surahNameEn))
        if result.count >= 5 { break }
      }
    }
    return result
  }
}
