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
///
/// BFF write failures are logged through `Telemetry`. The cache write
/// has already succeeded by the time we know — the call is
/// fire-and-forget — so we don't surface anything to the user, but the
/// failure is no longer invisible. Dashboards can group by
/// `AppError.telemetryCode` to spot a sustained desync between the
/// device cache and the server-of-record.
final class RemoteSyncedHistoryStore: HistoryStore {
  private let cache: HistoryStore
  private let me: MeClient
  private let telemetry: Telemetry

  /// Handle to the most recently spawned background write Task. Tests
  /// `await pendingWriteTask?.value` to block until the fire-and-forget
  /// write — including its telemetry-error catch block on the failure
  /// path — has settled. Production never reads this; the existence is
  /// purely to remove the yield-count race the older test pattern
  /// (`for _ in 0..<10 { await Task.yield() }`) had on macOS CI.
  /// Concurrent writes would race on this property but each Task still
  /// runs to completion regardless — losing the handle to one is
  /// acceptable because production never observes it.
  private(set) var pendingWriteTask: Task<Void, Never>?

  init(cache: HistoryStore, me: MeClient, telemetry: Telemetry) {
    self.cache = cache
    self.me = me
    self.telemetry = telemetry
  }

  // MARK: - LastPracticed

  func lastPracticed() -> LastPracticed? {
    cache.lastPracticed()
  }

  func setLastPracticed(_ entry: LastPracticed) {
    cache.setLastPracticed(entry)
    pendingWriteTask = Task { [me, telemetry] in
      do {
        _ = try await me.putLastPracticed(entry)
      } catch let error as AppError {
        telemetry.error(
          error,
          context: [
            "operation": "history.write",
            "kind": "lastPracticed",
            "surah_id": entry.surahId
          ]
        )
      } catch {
        // Non-AppError shouldn't happen on this path — MeClient is
        // contracted to throw AppError — but a generic error must
        // not crash the task. Surface it with the closest match so
        // dashboards still see it.
        telemetry.error(
          AppError.backendUnavailable(operation: "me.last-practiced.put"),
          context: [
            "operation": "history.write",
            "kind": "lastPracticed",
            "surah_id": entry.surahId,
            "raw_error": String(describing: error)
          ]
        )
      }
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
    pendingWriteTask = Task { [me, telemetry] in
      do {
        _ = try await me.putBestScore(surahId: surahId, ayahNumber: ayahNumber, entry: entry)
      } catch let error as AppError {
        telemetry.error(
          error,
          context: [
            "operation": "history.write",
            "kind": "bestScore",
            "surah_id": surahId,
            "ayah_number": String(ayahNumber)
          ]
        )
      } catch {
        telemetry.error(
          AppError.backendUnavailable(operation: "me.best-scores.put"),
          context: [
            "operation": "history.write",
            "kind": "bestScore",
            "surah_id": surahId,
            "ayah_number": String(ayahNumber),
            "raw_error": String(describing: error)
          ]
        )
      }
    }
  }

  // MARK: - Attempts

  func recentAttempts(limit: Int) -> [Attempt] {
    cache.recentAttempts(limit: limit)
  }

  func recordAttempt(_ attempt: Attempt) {
    cache.recordAttempt(attempt)
    pendingWriteTask = Task { [me, telemetry] in
      do {
        _ = try await me.recordAttempt(attempt)
      } catch let error as AppError {
        telemetry.error(
          error,
          context: [
            "operation": "history.write",
            "kind": "attempt",
            "surah_id": attempt.surahId,
            "ayah_number": String(attempt.ayahNumber),
            "attempt_id": attempt.id
          ]
        )
      } catch {
        telemetry.error(
          AppError.backendUnavailable(operation: "me.attempts.post"),
          context: [
            "operation": "history.write",
            "kind": "attempt",
            "attempt_id": attempt.id,
            "raw_error": String(describing: error)
          ]
        )
      }
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
  /// Failures are reported through telemetry but otherwise swallowed:
  /// a transient network blip leaves the cache as-is, and the next
  /// refresh attempt — or the next per-write fire-and-forget —
  /// converges.
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
    } catch let error as AppError {
      telemetry.error(error, context: ["operation": "history.refresh"])
    } catch {
      telemetry.error(
        AppError.backendUnavailable(operation: "me.refresh"),
        context: [
          "operation": "history.refresh",
          "raw_error": String(describing: error)
        ]
      )
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
