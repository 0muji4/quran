import Combine
import Foundation

/// In-memory `HistoryStore` for SwiftUI Previews and unit tests. State
/// is held in plain dictionaries; nothing is persisted.
final class InMemoryHistoryStore: HistoryStore {
  private var lastPracticedEntry: LastPracticed?
  private var bestScores: [String: BestScoreEntry] = [:]
  private var attempts: [Attempt] = []
  private let changeSubject = PassthroughSubject<Void, Never>()

  var changes: AnyPublisher<Void, Never> { changeSubject.eraseToAnyPublisher() }

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
    changeSubject.send()
  }

  func bestScore(surahId: String, ayahNumber: Int) -> BestScoreEntry? {
    bestScores["\(surahId):\(ayahNumber)"]
  }

  func bestScoresBySurah() -> [String: Int] {
    bestScores.maxBySurah()
  }

  func recordBestScore(surahId: String, ayahNumber: Int, score: Int, achievedAt: Date) {
    let key = "\(surahId):\(ayahNumber)"
    if let existing = bestScores[key], existing.score >= score { return }
    bestScores[key] = BestScoreEntry(score: score, achievedAt: achievedAt)
    changeSubject.send()
  }

  func recentAttempts(limit: Int) -> [Attempt] {
    Array(attempts.prefix(limit))
  }

  func recordAttempt(_ attempt: Attempt) {
    attempts.insert(attempt, at: 0)
    if attempts.count > HistoryStoreConstants.historyLimit {
      attempts = Array(attempts.prefix(HistoryStoreConstants.historyLimit))
    }
    changeSubject.send()
  }

  func clear() {
    lastPracticedEntry = nil
    bestScores = [:]
    attempts = []
    changeSubject.send()
  }

  @MainActor
  func refreshFromRemote() async {
    // No remote; in-memory state is the source of truth.
  }
}
