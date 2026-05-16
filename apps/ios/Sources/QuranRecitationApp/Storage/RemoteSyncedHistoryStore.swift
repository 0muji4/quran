import Foundation

/// `HistoryStore` decorator that mirrors writes through to the BFF
/// `/me/*` endpoints and rebuilds the local cache from the server on
/// demand. Reads return from the local cache for instant UI; writes
/// update the cache synchronously and fire a `MeClient` call in the
/// background.
///
/// Layered under `SignInGatedHistoryStore`, so anonymous calls never
/// reach this class. `refreshFromRemote()` is the bulk-pull called by
/// AppRoot on sign-in to seed the cache from the server before any
/// view consumes it; per-call refresh-throttling can layer on later
/// if reads-from-stale-cache become a problem.
final class RemoteSyncedHistoryStore: HistoryStore {
  private let cache: HistoryStore
  private let me: MeClient

  init(cache: HistoryStore, me: MeClient) {
    self.cache = cache
    self.me = me
  }

  // MARK: - LastPracticed

  func lastPracticed() -> LastPracticed? {
    cache.lastPracticed()
  }

  func setLastPracticed(_ entry: LastPracticed) {
    cache.setLastPracticed(entry)
    Task { [me] in
      _ = try? await me.putLastPracticed(entry)
    }
  }

  // MARK: - BestScores

  func bestScore(surahId: String, ayahNumber: Int) -> BestScoreEntry? {
    cache.bestScore(surahId: surahId, ayahNumber: ayahNumber)
  }

  func bestScore(forSurah surahId: String) -> Double? {
    cache.bestScore(forSurah: surahId)
  }

  func recordBestScore(surahId: String, ayahNumber: Int, score: Double, achievedAt: Date) {
    cache.recordBestScore(
      surahId: surahId,
      ayahNumber: ayahNumber,
      score: score,
      achievedAt: achievedAt
    )
    let entry = BestScoreEntry(score: score, achievedAt: achievedAt)
    Task { [me] in
      _ = try? await me.putBestScore(surahId: surahId, ayahNumber: ayahNumber, entry: entry)
    }
  }

  // MARK: - Attempts

  func recentAttempts(limit: Int) -> [Attempt] {
    cache.recentAttempts(limit: limit)
  }

  func recordAttempt(_ attempt: Attempt) {
    cache.recordAttempt(attempt)
    Task { [me] in
      _ = try? await me.recordAttempt(attempt)
    }
  }

  // MARK: - Clear

  func clear() {
    cache.clear()
  }

  // MARK: - Remote refresh

  /// Pull every record from the BFF concurrently and rebuild the
  /// local cache. The previous cache is wiped first so a sign-in
  /// against a different account does not leave stragglers from the
  /// previous identity (`AppRoot` also clears on sign-out, but
  /// belt-and-braces here keeps the contract local to one place).
  ///
  /// Failures are swallowed: a transient network blip leaves the
  /// cache as-is. The next refresh attempt — or the next per-write
  /// fire-and-forget — converges.
  @MainActor
  func refreshFromRemote() async {
    async let remoteLast = me.lastPracticed()
    async let remoteScores = me.bestScores()
    async let remoteAttempts = me.attempts(limit: HistoryStoreConstants.historyLimit)

    do {
      let (last, scores, attempts) = try await (remoteLast, remoteScores, remoteAttempts)
      cache.clear()
      if let last { cache.setLastPracticed(last) }
      for (key, entry) in scores {
        guard let (surahId, ayahNumber) = Self.parseBestScoreKey(key) else { continue }
        cache.recordBestScore(
          surahId: surahId,
          ayahNumber: ayahNumber,
          score: entry.score,
          achievedAt: entry.achievedAt
        )
      }
      // The server returns attempts newest-first; `cache.recordAttempt`
      // prepends, so replaying oldest-first yields the same ordering
      // the server presented.
      for attempt in attempts.reversed() {
        cache.recordAttempt(attempt)
      }
    } catch {
      // intentional: see method doc
    }
  }

  // MARK: - Helpers

  /// Best-score map keys are `"<surahId>:<ayahNumber>"`. A malformed
  /// key from the server is silently skipped rather than crashing the
  /// whole refresh — one bad entry should not strand the rest.
  private static func parseBestScoreKey(_ key: String) -> (String, Int)? {
    let parts = key.split(separator: ":", maxSplits: 1, omittingEmptySubsequences: false)
    guard
      parts.count == 2,
      !parts[0].isEmpty,
      let ayahNumber = Int(parts[1]),
      ayahNumber >= 1
    else {
      return nil
    }
    return (String(parts[0]), ayahNumber)
  }
}
