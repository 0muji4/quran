import Foundation

/// Production `HistoryStore` backed by `UserDefaults`. Encodes Codable
/// DTOs as JSON Data under the keys defined in `HistoryStoreConstants`.
/// Date encoding uses ISO 8601 so values are interchangeable with the
/// web client's `localStorage` schema.
final class UserDefaultsHistoryStore: HistoryStore {
  private let defaults: UserDefaults
  private let encoder: JSONEncoder
  private let decoder: JSONDecoder

  init(defaults: UserDefaults = .standard) {
    self.defaults = defaults
    let encoder = JSONEncoder()
    encoder.dateEncodingStrategy = .iso8601
    self.encoder = encoder
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    self.decoder = decoder
  }

  // MARK: - LastPracticed

  func lastPracticed() -> LastPracticed? {
    decode(LastPracticed.self, key: HistoryStoreConstants.Key.lastPracticed)
  }

  func setLastPracticed(_ entry: LastPracticed) {
    encode(entry, key: HistoryStoreConstants.Key.lastPracticed)
  }

  // MARK: - BestScores

  func bestScore(surahId: String, ayahNumber: Int) -> BestScoreEntry? {
    let all = bestScoresMap()
    return all[bestKey(surahId, ayahNumber)]
  }

  func bestScore(forSurah surahId: String) -> Double? {
    let all = bestScoresMap()
    let prefix = "\(surahId):"
    return all
      .filter { $0.key.hasPrefix(prefix) }
      .map(\.value.score)
      .max()
  }

  func recordBestScore(surahId: String, ayahNumber: Int, score: Double, achievedAt: Date) {
    var all = bestScoresMap()
    let key = bestKey(surahId, ayahNumber)
    if let existing = all[key], existing.score >= score { return }
    all[key] = BestScoreEntry(score: score, achievedAt: achievedAt)
    encode(all, key: HistoryStoreConstants.Key.bestScores)
  }

  // MARK: - Attempts

  func recentAttempts(limit: Int) -> [Attempt] {
    let log: AttemptLog? = decode(AttemptLog.self, key: HistoryStoreConstants.Key.recentAttempts)
    let attempts = log?.attempts ?? []
    return Array(attempts.prefix(limit))
  }

  func recordAttempt(_ attempt: Attempt) {
    var existing = recentAttempts(limit: HistoryStoreConstants.historyLimit)
    existing.insert(attempt, at: 0)
    let trimmed = Array(existing.prefix(HistoryStoreConstants.historyLimit))
    encode(AttemptLog(attempts: trimmed), key: HistoryStoreConstants.Key.recentAttempts)
  }

  // MARK: - Helpers

  private struct AttemptLog: Codable {
    let attempts: [Attempt]
  }

  private func bestKey(_ surahId: String, _ ayahNumber: Int) -> String {
    "\(surahId):\(ayahNumber)"
  }

  private func bestScoresMap() -> [String: BestScoreEntry] {
    decode([String: BestScoreEntry].self, key: HistoryStoreConstants.Key.bestScores) ?? [:]
  }

  private func encode<T: Encodable>(_ value: T, key: String) {
    do {
      let data = try encoder.encode(value)
      defaults.set(data, forKey: key)
    } catch {
      // Storage write failures are surfaced through AppError.storageUnavailable
      // by the calling ViewModel; here we silently drop to avoid crashing the
      // record/playback flow on quota or serialization issues.
    }
  }

  private func decode<T: Decodable>(_ type: T.Type, key: String) -> T? {
    guard let data = defaults.data(forKey: key) else { return nil }
    return try? decoder.decode(T.self, from: data)
  }
}
