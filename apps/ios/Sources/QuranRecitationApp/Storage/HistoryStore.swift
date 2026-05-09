import Foundation

// MARK: - DTOs

/// Mirrors `apps/web/app/lib/storage.ts`. Field names and JSON encoding
/// match the web shape so a future server-side history store can serve
/// both clients without per-platform mapping. See ADR 0007.

struct LastPracticed: Codable, Equatable {
  let surahId: String
  let ayahNumber: Int
  let surahNameEn: String
  let surahNameAr: String
  let ayahCount: Int
  let practicedAt: Date
}

struct BestScoreEntry: Codable, Equatable {
  let score: Double
  let achievedAt: Date
}

enum AttemptStatus: String, Codable {
  case completed = "COMPLETED"
  case failed = "FAILED"
}

struct Attempt: Codable, Equatable, Identifiable {
  let id: String
  let surahId: String
  let surahNameEn: String
  let ayahNumber: Int
  let score: Double?
  let jobId: String
  let createdAt: Date
  let status: AttemptStatus
  let durationMs: Int?
}

// MARK: - Protocol

/// Persistence surface for practice history. The View / ViewModel layer
/// only depends on this protocol; production uses
/// `UserDefaultsHistoryStore`, tests use `InMemoryHistoryStore`. A
/// future `RemoteHistoryStore` would be a drop-in swap.
protocol HistoryStore {
  func lastPracticed() -> LastPracticed?
  func setLastPracticed(_ entry: LastPracticed)

  func bestScore(surahId: String, ayahNumber: Int) -> BestScoreEntry?
  func bestScore(forSurah surahId: String) -> Double?
  func recordBestScore(surahId: String, ayahNumber: Int, score: Double, achievedAt: Date)

  func recentAttempts(limit: Int) -> [Attempt]
  func recordAttempt(_ attempt: Attempt)
}

extension HistoryStore {
  /// Convenience: 50-attempt history limit matching the web client.
  func recentAttempts() -> [Attempt] {
    recentAttempts(limit: HistoryStoreConstants.historyLimit)
  }
}

enum HistoryStoreConstants {
  static let historyLimit = 50

  enum Key {
    static let lastPracticed = "tilawah:last-practiced"
    static let bestScores = "tilawah:best-scores"
    static let recentAttempts = "tilawah:recent-attempts"
  }
}
