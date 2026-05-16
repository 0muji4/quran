import Foundation

/// In-memory `HistoryStore` for SwiftUI Previews and unit tests. State
/// is held in plain dictionaries; nothing is persisted.
final class InMemoryHistoryStore: HistoryStore {
  private var lastPracticedEntry: LastPracticed?
  private var bestScores: [String: BestScoreEntry] = [:]
  private var attempts: [Attempt] = []

  init(
    lastPracticed: LastPracticed? = nil,
    bestScores: [String: BestScoreEntry] = [:],
    attempts: [Attempt] = []
  ) {
    self.lastPracticedEntry = lastPracticed
    self.bestScores = bestScores
    self.attempts = attempts
  }

  func lastPracticed() -> LastPracticed? {
    lastPracticedEntry
  }

  func setLastPracticed(_ entry: LastPracticed) {
    lastPracticedEntry = entry
  }

  func bestScore(surahId: String, ayahNumber: Int) -> BestScoreEntry? {
    bestScores["\(surahId):\(ayahNumber)"]
  }

  func bestScore(forSurah surahId: String) -> Double? {
    let prefix = "\(surahId):"
    return bestScores
      .filter { $0.key.hasPrefix(prefix) }
      .map(\.value.score)
      .max()
  }

  func recordBestScore(surahId: String, ayahNumber: Int, score: Double, achievedAt: Date) {
    let key = "\(surahId):\(ayahNumber)"
    if let existing = bestScores[key], existing.score >= score { return }
    bestScores[key] = BestScoreEntry(score: score, achievedAt: achievedAt)
  }

  func recentAttempts(limit: Int) -> [Attempt] {
    Array(attempts.prefix(limit))
  }

  func recordAttempt(_ attempt: Attempt) {
    attempts.insert(attempt, at: 0)
    if attempts.count > HistoryStoreConstants.historyLimit {
      attempts = Array(attempts.prefix(HistoryStoreConstants.historyLimit))
    }
  }

  func clear() {
    lastPracticedEntry = nil
    bestScores = [:]
    attempts = []
  }

  @MainActor
  func refreshFromRemote() async {
    // No remote; in-memory state is the source of truth.
  }
}
